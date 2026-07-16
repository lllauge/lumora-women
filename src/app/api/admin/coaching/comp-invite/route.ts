import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { sendCoachingCompInviteEmail } from '@/lib/coaching-email'
import { upsertCoachingClientForOrder } from '@/lib/stripe-coaching-fulfillment'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const CompInviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(80).optional().default(''),
  lastName: z.string().max(80).optional().default(''),
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
  const limit = await checkRateLimit(`admin:coaching-comp-invite:${ip}`, 20, 3600)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many invites created. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = CompInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const input = parsed.data
  const email = input.email.trim().toLowerCase()
  const firstName = input.firstName.trim() || null
  const lastName = input.lastName.trim() || null

  const supabase = await createAdminClient()

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('email', email)
    .maybeSingle()

  const { data: existingClient } = await supabase
    .from('coaching_clients')
    .select('id, coaching_order_id')
    .eq('email', email)
    .maybeSingle()

  let orderId = existingClient?.coaching_order_id ?? null
  if (!orderId) {
    const { data: order, error: orderError } = await supabase
      .from('coaching_orders')
      .insert({
        user_id: userProfile?.id ?? null,
        email,
        first_name: userProfile?.first_name ?? firstName,
        last_name: userProfile?.last_name ?? lastName,
        amount: 0,
        status: 'paid',
      })
      .select('id')
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }
    orderId = order.id
  }

  const client = await upsertCoachingClientForOrder(supabase, {
    email,
    userProfileId: userProfile?.id ?? null,
    firstName: userProfile?.first_name ?? firstName,
    lastName: userProfile?.last_name ?? lastName,
    orderId,
  })

  if (!client.ok) {
    return NextResponse.json({ error: client.error }, { status: 500 })
  }

  const baseUrl = siteUrl(req)
  const onboardingPath = input.lang === 'es' ? '/coaching/onboarding?lang=es' : '/coaching/onboarding'
  const onboardingRedirect = encodeURIComponent(onboardingPath)
  const signupUrl = `${baseUrl}/signup?email=${encodeURIComponent(email)}&redirectTo=${onboardingRedirect}`
  const loginUrl = `${baseUrl}/login?redirectTo=${onboardingRedirect}`

  const emailResult = await sendCoachingCompInviteEmail({
    to: email,
    firstName: input.firstName,
    signupUrl,
    loginUrl,
    lang: input.lang,
  })

  return NextResponse.json({
    signupUrl,
    loginUrl,
    emailed: emailResult.ok,
    emailError: emailResult.ok ? null : emailResult.error,
  })
}
