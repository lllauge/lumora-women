import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { sendCoachingCheckoutEmail } from '@/lib/coaching-email'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'

const CoachingCheckoutSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(80).optional().default(''),
  lastName: z.string().max(80).optional().default(''),
  amount: z.coerce.number().min(1).max(25000),
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
  const limit = await checkRateLimit(`admin:coaching-checkout:${ip}`, 20, 3600)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout links created. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = CoachingCheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const input = parsed.data
  const email = input.email.trim().toLowerCase()
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim()
  const unitAmount = Math.round(input.amount * 100)
  const stripe = new Stripe(stripeKey)
  const baseUrl = siteUrl(req)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          product_data: {
            name: 'Lumora Women 1:1 Coaching',
            description: 'Private macro and nutrition coaching onboarding access.',
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/coaching/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/work-with-me`,
    payment_intent_data: {
      receipt_email: email,
      description: 'Lumora Women 1:1 Coaching',
      metadata: {
        product_type: 'coaching',
        offer: 'one_on_one',
        email,
      },
    },
    metadata: {
      product_type: 'coaching',
      offer: 'one_on_one',
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
    },
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 500 })
  }

  const emailResult = await sendCoachingCheckoutEmail({
    to: email,
    firstName: input.firstName,
    checkoutUrl: session.url,
    amount: input.amount,
  })

  return NextResponse.json({
    url: session.url,
    emailed: emailResult.ok,
    emailError: emailResult.ok ? null : emailResult.error,
  })
}
