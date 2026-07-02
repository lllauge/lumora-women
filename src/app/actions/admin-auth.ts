'use server'

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/audit-log'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  adminSessionCookies,
} from '@/lib/admin-session'
import { sessionActivityCookies } from '@/lib/session-activity'
import { sendAdminSms } from '@/lib/admin-sms'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { NextRequest } from 'next/server'
import { verifyRecaptcha } from '@/lib/recaptcha'

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
 * Native Supabase MFA is mandatory. Password verification creates an AAL1
 * session, then /mfa enrolls or verifies an authenticator to reach AAL2.
 */
export async function signInAdmin(formData: FormData): Promise<AdminAuthResult> {
  const email    = (formData.get('email') ?? '').toString().trim()
  const password = (formData.get('password') ?? '').toString()
  const captchaToken = (formData.get('captchaToken') ?? '').toString()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const headerStore = await headers()
  const requestHeaders = new Headers()
  headerStore.forEach((value, key) => requestHeaders.set(key, value))
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || 'localhost'
  const protocol = headerStore.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const captcha = await verifyRecaptcha({
    token: captchaToken,
    action: 'admin_login',
    request: new NextRequest(`${protocol}://${host}/admin/login`, { headers: requestHeaders }),
    minimumScore: 0.7,
  })
  if (!captcha.ok) {
    return { error: 'Security verification failed. Please refresh and try again.' }
  }

  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = await getClientIpFromHeaders()
  const rateLimit = await checkRateLimit(`admin_login:${ip}`, 5, 900)
  if (!rateLimit.allowed) {
    const alertLimit = await checkRateLimit(`security_alert_admin_login:${ip}`, 1, 60 * 60)
    if (alertLimit.allowed) {
      await sendAdminSms(
        `Security alert: repeated administrator login attempts were blocked from ${ip}.`,
        { title: 'Lumora · Admin security' },
      )
    }
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

  cookieStore.delete(adminSessionCookies.legacyPending)
  cookieStore.delete(adminSessionCookies.legacyMfa)

  await logAdminAction({
    adminUserId: signInData.user.id,
    action: 'login',
  })

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance?.currentLevel !== 'aal2') {
    const mode = assurance?.nextLevel === 'aal2' ? 'challenge' : 'enroll'
    redirect(`/mfa?area=admin&mode=${mode}&redirectTo=/admin`)
  }
  redirect('/admin')
}

/** Legacy endpoint retained so old bookmarked verification pages migrate safely. */
export async function verifyAdminTotp(formData?: FormData): Promise<AdminAuthResult> {
  void formData
  redirect('/mfa?area=admin&mode=challenge&redirectTo=/admin')
}

export async function verifyAdminStepUp(code: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: 'Enter your current 6-digit authenticator code.' }
  }

  let user: { id: string }
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    ;({ user, supabase } = await getVerifiedAdminUser())
  } catch {
    return { ok: false, error: 'Unauthorized.' }
  }

  const limit = await checkRateLimit(`admin_step_up:${user.id}`, 5, 15 * 60)
  if (!limit.allowed) return { ok: false, error: 'Too many verification attempts. Wait 15 minutes.' }

  const factors = await supabase.auth.mfa.listFactors()
  const factor = factors.data?.totp.find((item) => item.status === 'verified')
  if (!factor) return { ok: false, error: 'No administrator authenticator is available.' }

  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id })
  if (challenge.error) return { ok: false, error: 'Could not start administrator verification.' }
  const verified = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.data.id,
    code,
  })
  if (verified.error) return { ok: false, error: 'Authentication code was not accepted.' }

  await logAdminAction({ adminUserId: user.id, action: 'totp_verified' })
  return { ok: true }
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
  cookieStore.delete(sessionActivityCookies.admin)
  cookieStore.delete(sessionActivityCookies.client)
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
