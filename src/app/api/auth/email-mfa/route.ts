import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { requireSameOrigin } from '@/lib/request-security'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  clientEmailMfaCookie,
  clientEmailMfaLifetimeSeconds,
  clientEmailMfaValuesMatch,
  createClientEmailMfaCookie,
  getSessionId,
  hashClientEmailMfaCode,
} from '@/lib/client-email-mfa'
import { sendClientVerificationCode } from '@/lib/auth-email'
import { verifyRecaptcha } from '@/lib/recaptcha'

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('send'),
    captchaToken: z.string().max(4096).nullable().optional(),
  }),
  z.object({ action: z.literal('verify'), code: z.string().regex(/^\d{6}$/) }),
])

function generateCode() {
  const maximumUnbiasedValue = 4_294_000_000
  const values = new Uint32Array(1)
  do {
    crypto.getRandomValues(values)
  } while (values[0] >= maximumUnbiasedValue)
  return String(values[0] % 1_000_000).padStart(6, '0')
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid verification request.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const sessionId = getSessionId(session?.access_token)
  if (!user?.email || !sessionId) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }

  const service = await createAdminClient()
  const { data: profile } = await service
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role === 'admin') {
    return NextResponse.json(
      { error: 'Administrators must use an authenticator app.' },
      { status: 403 },
    )
  }

  if (parsed.data.action === 'send') {
    const captcha = await verifyRecaptcha({
      token: parsed.data.captchaToken,
      action: 'email_mfa_send',
      request,
      minimumScore: 0.5,
    })
    if (!captcha.ok) {
      return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 400 })
    }

    const ip = getClientIp(request.headers)
    const [userLimit, ipLimit] = await Promise.all([
      checkRateLimit(`client_email_mfa_user:${user.id}`, 5, 60 * 60),
      checkRateLimit(`client_email_mfa_ip:${ip}`, 15, 60 * 60),
    ])
    if (!userLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many codes were requested. Wait an hour and try again.' },
        { status: 429 },
      )
    }

    const code = generateCode()
    const codeHash = await hashClientEmailMfaCode(user.id, sessionId, code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await service
      .from('client_email_mfa_challenges')
      .delete()
      .eq('user_id', user.id)
      .eq('session_id', sessionId)

    const { error: challengeError } = await service
      .from('client_email_mfa_challenges')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        code_hash: codeHash,
        expires_at: expiresAt,
      })
    if (challengeError) {
      console.error('[client-email-mfa] Could not create challenge:', challengeError.message)
      return NextResponse.json({ error: 'Could not create a verification code.' }, { status: 503 })
    }

    const sent = await sendClientVerificationCode({ to: user.email, code })
    if (!sent.ok) {
      await service
        .from('client_email_mfa_challenges')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
      console.error('[client-email-mfa] Could not send code:', sent.error)
      return NextResponse.json({ error: 'Could not email your verification code.' }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  }

  const attemptLimit = await checkRateLimit(
    `client_email_mfa_verify:${user.id}:${sessionId}`,
    6,
    10 * 60,
  )
  if (!attemptLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Request a new code.' },
      { status: 429 },
    )
  }

  const { data: challenge } = await service
    .from('client_email_mfa_challenges')
    .select('code_hash, expires_at, attempts')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (
    !challenge
    || challenge.attempts >= 5
    || new Date(challenge.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: 'That code expired. Request a new code.' },
      { status: 400 },
    )
  }

  await service
    .from('client_email_mfa_challenges')
    .update({ attempts: challenge.attempts + 1 })
    .eq('user_id', user.id)
    .eq('session_id', sessionId)

  const submittedHash = await hashClientEmailMfaCode(user.id, sessionId, parsed.data.code)
  if (!clientEmailMfaValuesMatch(submittedHash, challenge.code_hash)) {
    return NextResponse.json({ error: 'That code is incorrect.' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + clientEmailMfaLifetimeSeconds * 1000)
  const { error: verificationError } = await service
    .from('client_email_mfa_sessions')
    .upsert({
      user_id: user.id,
      session_id: sessionId,
      verified_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'user_id,session_id' })
  if (verificationError) {
    console.error('[client-email-mfa] Could not save verification:', verificationError.message)
    return NextResponse.json({ error: 'Could not complete verification.' }, { status: 503 })
  }

  await service
    .from('client_email_mfa_challenges')
    .delete()
    .eq('user_id', user.id)
    .eq('session_id', sessionId)

  // Clients no longer use authenticator apps. Retire those factors only after
  // the email challenge has succeeded.
  const factors = await service.auth.admin.mfa.listFactors({ userId: user.id })
  if (!factors.error) {
    for (const factor of factors.data.factors) {
      if (factor.factor_type === 'totp' || factor.factor_type === 'phone') {
        await service.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id })
      }
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    clientEmailMfaCookie,
    await createClientEmailMfaCookie(
      user.id,
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
  return response
}
