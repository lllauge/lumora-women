import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'
import { sendAdminSms } from '@/lib/admin-sms'

const LoginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1024),
  captchaToken: z.string().max(4096).nullable().optional(),
})

async function stableAccountKey(email: string) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyCaptcha(token: string | null | undefined, ip: string) {
  const secret = process.env.HCAPTCHA_SECRET_KEY
  const siteKeyConfigured = Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY)
  if (!siteKeyConfigured && !secret) return true
  if (!secret) {
    console.error('[auth-login] hCaptcha site key is configured without HCAPTCHA_SECRET_KEY.')
    return false
  }
  if (!token) return false

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  })
  const response = await fetch('https://api.hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  }).catch(() => null)
  if (!response?.ok) return false
  const result = await response.json().catch(() => null) as { success?: boolean } | null
  return result?.success === true
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const parsed = LoginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })
  }

  const ip = getClientIp(request.headers)
  const accountKey = await stableAccountKey(parsed.data.email)
  const [ipLimit, accountLimit] = await Promise.all([
    checkRateLimit(`user_login_ip:${ip}`, 10, 15 * 60),
    checkRateLimit(`user_login_account:${accountKey}`, 5, 15 * 60),
  ])
  if (!ipLimit.allowed || !accountLimit.allowed) {
    const retryAfter = Math.max(
      ipLimit.allowed ? 0 : ipLimit.retryAfterSeconds,
      accountLimit.allowed ? 0 : accountLimit.retryAfterSeconds,
    )
    const alertLimit = await checkRateLimit(`security_alert_login:${ip}`, 1, 60 * 60)
    if (alertLimit.allowed) {
      await sendAdminSms(
        `Security alert: repeated user login attempts were blocked from ${ip}.`,
        { title: 'Lumora · Security' },
      )
    }
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  if (!await verifyCaptcha(parsed.data.captchaToken, ip)) {
    return NextResponse.json({ error: 'Please complete the security check again.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  return NextResponse.json({
    role: profile?.role === 'admin' ? 'admin' : 'user',
    mfaMode: assurance?.currentLevel === 'aal2'
      ? null
      : assurance?.nextLevel === 'aal2' ? 'challenge' : 'enroll',
  })
}
