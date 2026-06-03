import Stripe from 'stripe'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

const CoachingMetadataSchema = z.object({
  product_type: z.literal('coaching'),
  offer: z.string().default('one_on_one'),
})

export type CoachingFulfillmentResult =
  | { ok: true; clientId: string; email: string }
  | { ok: false; error: string; status?: number }

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null
}

export async function fulfillCoachingCheckout(
  session: Stripe.Checkout.Session
): Promise<CoachingFulfillmentResult> {
  const parsed = CoachingMetadataSchema.safeParse(session.metadata ?? {})
  if (!parsed.success) {
    return { ok: false, error: 'Missing or invalid coaching checkout metadata.', status: 400 }
  }

  if (session.payment_status !== 'paid') {
    return { ok: false, error: 'Payment has not been completed yet.', status: 409 }
  }

  const email = normalizeEmail(session.customer_details?.email ?? session.customer_email)
  if (!email) {
    return { ok: false, error: 'Stripe checkout did not include a client email.', status: 400 }
  }

  const name = session.customer_details?.name ?? ''
  const [firstName, ...lastNameParts] = name.split(/\s+/).filter(Boolean)
  const lastName = lastNameParts.join(' ') || null

  const stripePaymentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id

  const supabase = await createAdminClient()

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('email', email)
    .maybeSingle()

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('coaching_orders')
    .select('id')
    .or(`stripe_session_id.eq.${session.id},stripe_payment_id.eq.${stripePaymentId}`)
    .maybeSingle()

  if (existingOrderError) {
    return { ok: false, error: existingOrderError.message, status: 500 }
  }

  let orderId = existingOrder?.id ?? null
  if (!orderId) {
    const { data: order, error: orderError } = await supabase
      .from('coaching_orders')
      .insert({
        user_id: userProfile?.id ?? null,
        email,
        first_name: userProfile?.first_name ?? firstName ?? null,
        last_name: userProfile?.last_name ?? lastName,
        amount: (session.amount_total ?? 0) / 100,
        stripe_session_id: session.id,
        stripe_payment_id: stripePaymentId,
        status: 'paid',
      })
      .select('id')
      .single()

    if (orderError) {
      return { ok: false, error: orderError.message, status: 500 }
    }

    orderId = order.id
  }

  const { data: client, error: clientError } = await supabase
    .from('coaching_clients')
    .upsert(
      {
        user_id: userProfile?.id ?? null,
        email,
        first_name: userProfile?.first_name ?? firstName ?? null,
        last_name: userProfile?.last_name ?? lastName,
        status: 'needs_onboarding',
        onboarding_status: 'not_started',
        coaching_order_id: orderId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('id, email')
    .single()

  if (clientError) {
    return { ok: false, error: clientError.message, status: 500 }
  }

  return { ok: true, clientId: client.id, email: client.email }
}
