import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { sendClientLoginCode } from '@/lib/auth-email'
import {
  clientEmailMfaCookie,
  clientEmailMfaLifetimeSeconds,
  createClientEmailMfaCookie,
  getSessionId,
} from '@/lib/client-email-mfa'

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('send'),
    email: z.string().trim().email().max(320),
    captchaToken: z.string().max(4096).nullable().optional(),
  }),
  z.object({
    action: z.literal('verify'),
    email: z.string().trim().email().max(320),
    code: z.string().regex(/^\d{6}$/),
  }),
])

async function stableAccountKey(email: string) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Passwordless fallback login for clients: after failed password attempts the
 * login page offers to email a one-time code. The code comes from Supabase's
 * magiclink OTP, so verifying it creates a normal session — but because the
 * code already proves inbox access, the email-MFA step is marked satisfied
 * so the client is not asked for a second emailed code. Admins are excluded:
 * they must use their password and authenticator.
 */
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid login code request.' }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const ip = getClientIp(request.headers)
  const accountKey = await stableAccountKey(email)
  const service = await createAdminClient()

  if (parsed.data.action === 'send') {
    const captcha = await verifyRecaptcha({
      token: parsed.data.captchaToken,
      action: 'login_code_send',
      request,
      minimumScore: 0.5,
    })
    if (!captcha.ok) {
      return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 400 })
    }

    const [accountLimit, ipLimit] = await Promise.all([
      checkRateLimit(`login_code_account:${accountKey}`, 3, 60 * 60),
      checkRateLimit(`login_code_ip:${ip}`, 10, 60 * 60),
    ])
    if (!accountLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many codes were requested. Wait an hour and try again.' },
        { status: 429 },
      )
    }

    const { data: profile } = await service
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()

    // Do not reveal whether an account exists. Admins never get code login.
    if (!profile || profile.role === 'admin') {
      return NextResponse.json({ ok: true })
    }

    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError || !link.properties?.email_otp) {
      console.error('[login-code] Could not create login code:', linkError?.message)
      return NextResponse.json({ error: 'Could not create a login code.' }, { status: 503 })
    }

    const sent = await sendClientLoginCode({ to: email, code: link.properties.email_otp })
    if (!sent.ok) {
      console.error('[login-code] Could not email login code:', sent.error)
      return NextResponse.json({ error: 'Could not email your login code.' }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  }

  const [verifyAccountLimit, verifyIpLimit] = await Promise.all([
    checkRateLimit(`login_code_verify_account:${accountKey}`, 6, 10 * 60),
    checkRateLimit(`login_code_verify_ip:${ip}`, 30, 10 * 60),
  ])
  if (!verifyAccountLimit.allowed || !verifyIpLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Request a new code.' },
      { status: 429 },
    )
  }

  const supabase = await createClient()
  let verified = await supabase.auth.verifyOtp({ email, token: parsed.data.code, type: 'email' })
  if (verified.error) {
    verified = await supabase.auth.verifyOtp({ email, token: parsed.data.code, type: 'magiclink' })
  }
  if (verified.error || !verified.data.user || !verified.data.session) {
    return NextResponse.json({ error: 'That code is incorrect or expired.' }, { status: 400 })
  }

  const { data: profile } = await service
    .from('users')
    .select('role')
    .eq('id', verified.data.user.id)
    .maybeSingle()
  if (profile?.role === 'admin') {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'Administrators must sign in with their password and authenticator.' },
      { status: 403 },
    )
  }

  const response = NextResponse.json({ ok: true })

  // The emailed code already proved inbox access, so satisfy the email-MFA
  // gate for this session instead of asking for a second emailed code.
  const sessionId = getSessionId(verified.data.session.access_token)
  if (sessionId) {
    const expiresAt = new Date(Date.now() + clientEmailMfaLifetimeSeconds * 1000)
    const { error: verificationError } = await service
      .from('client_email_mfa_sessions')
      .upsert({
        user_id: verified.data.user.id,
        session_id: sessionId,
        verified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id,session_id' })
    if (verificationError) {
      // Not fatal: the client is signed in and the MFA page can email a fresh code.
      console.error('[login-code] Could not save email MFA verification:', verificationError.message)
    } else {
      response.cookies.set(
        clientEmailMfaCookie,
        await createClientEmailMfaCookie(
          verified.data.user.id,
          sessionId,
          Math.floor(expiresAt.getTime() / 1000),
        ),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: clientEmailMfaLifetimeSeconds,
          path: '/',
        },
      )
    }
  }

  return response
}
