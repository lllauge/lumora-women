import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { sendCoachingCompInviteEmail } from '@/lib/coaching-email'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const ResendOnboardingSchema = z.object({
  clientId: z.string().uuid(),
  lang: z.enum(['en', 'es']).optional().default('en'),
})

function siteUrl(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/+$/, '')
  }
  return req.nextUrl.origin
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const ip = getClientIp(req.headers)
  const limit = await checkRateLimit(`admin:coaching-resend-onboarding:${ip}`, 30, 3600)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many onboarding emails sent. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = ResendOnboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data: client, error } = await supabase
    .from('coaching_clients')
    .select('email, first_name, status, onboarding_status')
    .eq('id', parsed.data.clientId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!client?.email) return NextResponse.json({ error: 'Client email not found.' }, { status: 404 })

  const email = client.email.trim().toLowerCase()
  const baseUrl = siteUrl(req)
  const onboardingPath = parsed.data.lang === 'es' ? '/coaching/onboarding?lang=es' : '/coaching/onboarding'
  const onboardingRedirect = encodeURIComponent(onboardingPath)
  const signupUrl = `${baseUrl}/signup?email=${encodeURIComponent(email)}&redirectTo=${onboardingRedirect}`
  const loginUrl = `${baseUrl}/login?redirectTo=${onboardingRedirect}`

  const emailResult = await sendCoachingCompInviteEmail({
    to: email,
    firstName: client.first_name ?? undefined,
    signupUrl,
    loginUrl,
    lang: parsed.data.lang,
  })

  return NextResponse.json({
    signupUrl,
    loginUrl,
    emailed: emailResult.ok,
    emailError: emailResult.ok ? null : emailResult.error,
  })
}

