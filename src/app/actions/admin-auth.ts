'use server'

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyTotp } from '@/lib/totp'
import { logAdminAction } from '@/lib/audit-log'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  adminSessionCookies,
  createSignedAdminCookie,
  verifySignedAdminCookie,
} from '@/lib/admin-session'

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

  // Verify admin role via service client (bypasses RLS — auth.uid() is not
  // available in the same request that called signInWithPassword)
  const serviceClient = getAdminServiceClient()
  const { data: roleRow, error: roleError } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', signInData.user.id)
    .maybeSingle()

  if (roleError || roleRow?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'This account does not have admin access.' }
  }

  // Fetch totp_secret separately so a missing column doesn't block login
  const { data: totpRow, error: totpError } = await serviceClient
    .from('users')
    .select('totp_secret')
    .eq('id', signInData.user.id)
    .maybeSingle()
  const profile = { ...roleRow, totp_secret: totpError ? null : (totpRow?.totp_secret ?? null) }

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
    const pendingCookie = await createSignedAdminCookie('totp-pending', signInData.user.id, 5 * 60)
    // TOTP configured — require second factor
    cookieStore.set(adminSessionCookies.pending, pendingCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minute window to enter TOTP
      path: '/',
    })
    cookieStore.delete(adminSessionCookies.legacyPending)
    cookieStore.delete(adminSessionCookies.legacyMfa)
    redirect('/admin/verify-totp')
  }

  // No TOTP configured — grant direct access (setup mode)
  const mfaCookie = await createSignedAdminCookie('mfa', signInData.user.id, 8 * 60 * 60)
  cookieStore.set(adminSessionCookies.mfa, mfaCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  })
  cookieStore.delete(adminSessionCookies.legacyPending)
  cookieStore.delete(adminSessionCookies.legacyMfa)

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Session expired. Please log in again.' }
  }

  const pending = cookieStore.get(adminSessionCookies.pending)?.value
  const pendingIsValid = await verifySignedAdminCookie(pending, 'totp-pending', user.id)
  if (!pendingIsValid) {
    cookieStore.delete(adminSessionCookies.pending)
    cookieStore.delete(adminSessionCookies.legacyPending)
    return { error: 'No pending TOTP session. Please log in first.' }
  }

  // Get TOTP secret via service role (not exposed to client via RLS)
  const adminClient = getAdminServiceClient()
  const { data: roleRow, error: totpRoleError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (totpRoleError || roleRow?.role !== 'admin') {
    return { error: 'TOTP is not configured for this account.' }
  }

  const { data: totpRow, error: totpSecretError } = await adminClient
    .from('users')
    .select('totp_secret')
    .eq('id', user.id)
    .maybeSingle()

  const profile = {
    role: roleRow.role,
    totp_secret: totpSecretError ? null : (totpRow?.totp_secret ?? null),
  }

  if (!profile.totp_secret) {
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
  const mfaCookie = await createSignedAdminCookie('mfa', user.id, 8 * 60 * 60)
  cookieStore.delete(adminSessionCookies.pending)
  cookieStore.delete(adminSessionCookies.legacyPending)
  cookieStore.set(adminSessionCookies.mfa, mfaCookie, {
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
  cookieStore.delete(adminSessionCookies.loginAt)
  cookieStore.delete(adminSessionCookies.pending)
  cookieStore.delete(adminSessionCookies.mfa)
  cookieStore.delete(adminSessionCookies.legacyPending)
  cookieStore.delete(adminSessionCookies.legacyMfa)
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
