import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillPaidCourseCheckout } from '@/lib/stripe-fulfillment'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const result = await fulfillPaidCourseCheckout(session)
    if (!result.ok && result.status !== 409) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
    }
  }

  return NextResponse.json({ received: true })
}
