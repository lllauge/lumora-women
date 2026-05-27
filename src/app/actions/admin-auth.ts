'use server'

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyTotp } from '@/lib/totp'
import { logAdminAction } from '@/lib/audit-log'
import { checkRateLimit } from '@/lib/rate-limit'

export type AdminAuthResult = { error?: string }

function getAdminServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getClientIpFromHeaders(): Promise<string> {
  const headerStore = await headers()
  const cf = headerStore.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = headerStore.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headerStore.get('x-real-ip') ?? 'unknown'
}

/**
 * Step 1: Verify email + password.
 * If the admin has TOTP configured, sets a pending cookie and redirects
 * to /admin/verify-totp. Otherwise grants full access directly.
 */
export async function signInAdmin(formData: FormData): Promise<AdminAuthResult> {
  const email    = (formData.get('email') ?? '').toString().trim()
  const password = (formData.get('password') ?? '').toString()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = await getClientIpFromHeaders()
  const rateLimit = await checkRateLimit(`admin_login:${ip}`, 5, 900)
  if (!rateLimit.allowed) {
    return {
      error: 'Too many login attempts. Please wait 15 minutes before trying again.',
    }
  }

  const supabase = await createClient()

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password })

  if (signInError || !signInData.user) {
    return { error: 'Invalid email or password.' }
  }

  // Verify admin role
  const { data: profile, error: roleError } = await supabase
    .from('users')
    .select('role, totp_secret')
    .eq('id', signInData.user.id)
    .maybeSingle()

  if (roleError || profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'This account does not have admin access.' }
  }

  // Set admin_login_at cookie for session timeout tracking
  const cookieStore = await cookies()
  const loginTimestamp = Math.floor(Date.now() / 1000).toString()
  cookieStore.set('admin_login_at', loginTimestamp, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  })

  if (profile?.totp_secret) {
    // TOTP configured — require second factor
    cookieStore.set('totp_pending', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minute window to enter TOTP
      path: '/',
    })
    redirect('/admin/verify-totp')
  }

  // No TOTP configured — grant direct access (setup mode)
  cookieStore.set('totp_verified', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  })

  await logAdminAction({
    adminUserId: signInData.user.id,
    action: 'login',
  })

  redirect('/admin')
}

/**
 * Step 2: Verify the TOTP code after password authentication.
 */
export async function verifyAdminTotp(formData: FormData): Promise<AdminAuthResult> {
  const token = (formData.get('token') ?? '').toString().trim()

  if (!token || !/^\d{6}$/.test(token)) {
    return { error: 'Please enter the 6-digit code from your authenticator app.' }
  }

  const cookieStore = await cookies()
  const pending = cookieStore.get('totp_pending')?.value
  if (pending !== '1') {
    return { error: 'No pending TOTP session. Please log in first.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Session expired. Please log in again.' }
  }

  // Get TOTP secret via service role (not exposed to client via RLS)
  const adminClient = getAdminServiceClient()
  const { data: profile } = await adminClient
    .from('users')
    .select('totp_secret, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin' || !profile?.totp_secret) {
    return { error: 'TOTP is not configured for this account.' }
  }

  // Rate limit TOTP attempts: 5 per 15 minutes
  const ip = await getClientIpFromHeaders()
  const rateLimit = await checkRateLimit(`admin_totp:${ip}`, 5, 900)
  if (!rateLimit.allowed) {
    return { error: 'Too many TOTP attempts. Please wait 15 minutes.' }
  }

  const isValid = verifyTotp(token, profile.totp_secret)

  if (!isValid) {
    await logAdminAction({ adminUserId: user.id, action: 'totp_failed' })
    return { error: 'Invalid authentication code. Please try again.' }
  }

  // TOTP verified — grant full admin access
  cookieStore.delete('totp_pending')
  cookieStore.set('totp_verified', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  })

  await logAdminAction({ adminUserId: user.id, action: 'totp_verified' })

  redirect('/admin')
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await logAdminAction({ adminUserId: user.id, action: 'logout' })
  }
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('admin_login_at')
  cookieStore.delete('totp_pending')
  cookieStore.delete('totp_verified')
  redirect('/admin/login')
}

/**
 * Re-authenticate the admin with their current password.
 * Used before sensitive actions (e.g. CSV export).
 */
export async function reAuthAdmin(password: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })

  if (error) {
    return { ok: false, error: 'Incorrect password.' }
  }

  return { ok: true }
}
