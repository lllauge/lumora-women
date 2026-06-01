import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

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
    const { courseId, userId } = session.metadata ?? {}

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Create order record
    await supabase.from('orders').insert({
      user_id: userId,
      course_id: courseId,
      stripe_session_id: session.id,
      amount: (session.amount_total ?? 0) / 100,
      status: 'paid',
    })

    // Enroll user
    await supabase.from('enrollments').upsert(
      { user_id: userId, course_id: courseId },
      { onConflict: 'user_id,course_id' }
    )
  }

  return NextResponse.json({ received: true })
}
