import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'

const CheckoutSchema = z.object({
  courseId: z.string().uuid('courseId must be a valid UUID'),
})

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function requestOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : req.nextUrl.origin
}

function getCheckoutSiteUrl(req: NextRequest) {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    ?? normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  const configuredIsLocal =
    configured?.includes('localhost') || configured?.includes('127.0.0.1')

  if (configured && (process.env.NODE_ENV !== 'production' || !configuredIsLocal)) {
    return configured
  }

  return normalizeOrigin(requestOrigin(req)) ?? 'https://www.lumorawomen.com'
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  // ── Rate limiting: 10 checkout attempts per hour per IP ──────────────────
  const ip = getClientIp(req.headers)
  const rateLimit = await checkRateLimit(`checkout:${ip}`, 10, 3600)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  }

  // ── Parse and validate body ───────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { courseId } = parsed.data

  // ── Verify session (never trust client-supplied userId) ───────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // ── Email verification gate ───────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user.email_confirmed_at) {
    return NextResponse.json(
      { error: 'Please verify your email address before purchasing.' },
      { status: 403 }
    )
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, price, is_free')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (course.is_free) {
    return NextResponse.json({ error: 'This course is free — no checkout needed.' }, { status: 400 })
  }

  const priceInDollars = Number(course.price ?? 0)
  const unitAmount = Math.round(priceInDollars * 100)
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    return NextResponse.json({ error: 'This course does not have a valid checkout price.' }, { status: 400 })
  }

  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (existingEnrollment) {
    return NextResponse.json({ error: 'You already have access to this course.' }, { status: 409 })
  }

  const stripe = new Stripe(stripeKey)
  const siteUrl = getCheckoutSiteUrl(req)

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: course.title },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${siteUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/courses/${courseId}`,
    customer_email: user.email,
    metadata: {
      courseId: course.id,
      userId: user.id,
    },
  })

  return NextResponse.json({ url: stripeSession.url })
}
