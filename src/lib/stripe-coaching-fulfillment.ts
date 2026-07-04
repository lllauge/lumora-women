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

type CoachingClientWrite = {
  email: string
  userProfileId: string | null
  firstName: string | null
  lastName: string | null
  orderId: string
}

/**
 * Attach a paid (or comped) coaching order to the client record for this
 * email without damaging an existing client. A renewal payment or comp
 * invite must never reset an onboarded client back to "needs_onboarding",
 * and must never overwrite a linked auth user with null — clients whose
 * login email differs from their client-record email would be locked out
 * of the portal.
 */
export async function upsertCoachingClientForOrder(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  input: CoachingClientWrite,
): Promise<{ ok: true; clientId: string; email: string } | { ok: false; error: string }> {
  const now = new Date().toISOString()

  const { data: existing, error: lookupError } = await supabase
    .from('coaching_clients')
    .select('id, email, user_id, status, onboarding_status, first_name, last_name')
    .eq('email', input.email)
    .maybeSingle()
  if (lookupError) return { ok: false, error: lookupError.message }

  if (!existing) {
    const { data: created, error: insertError } = await supabase
      .from('coaching_clients')
      .insert({
        user_id: input.userProfileId,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        status: 'needs_onboarding',
        onboarding_status: 'not_started',
        coaching_order_id: input.orderId,
        paid_at: now,
        updated_at: now,
      })
      .select('id, email')
      .single()
    if (!insertError) return { ok: true, clientId: created.id, email: created.email }
    // Unique-email race (webhook and confirmation page fulfill concurrently):
    // fall through to the update path against the row the other writer won.
    if (insertError.code !== '23505') return { ok: false, error: insertError.message }
  }

  const { data: current, error: reloadError } = await supabase
    .from('coaching_clients')
    .select('id, email, user_id, status, onboarding_status, first_name, last_name')
    .eq('email', input.email)
    .single()
  if (reloadError) return { ok: false, error: reloadError.message }

  const patch: Record<string, unknown> = {
    coaching_order_id: input.orderId,
    paid_at: now,
    updated_at: now,
  }
  if (!current.user_id && input.userProfileId) patch.user_id = input.userProfileId
  if (!current.first_name && input.firstName) patch.first_name = input.firstName
  if (!current.last_name && input.lastName) patch.last_name = input.lastName
  // A client who never finished onboarding gets re-pointed at it; a returning
  // client (completed/cancelled/paused) paid again and needs Laura's action;
  // an onboarded active/plan_pending client keeps her state untouched.
  if (current.onboarding_status === 'not_started') {
    patch.status = 'needs_onboarding'
  } else if (['completed', 'cancelled', 'paused'].includes(current.status)) {
    patch.status = 'plan_pending'
  }

  const { error: updateError } = await supabase
    .from('coaching_clients')
    .update(patch)
    .eq('id', current.id)
  if (updateError) return { ok: false, error: updateError.message }

  return { ok: true, clientId: current.id, email: current.email }
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

  const client = await upsertCoachingClientForOrder(supabase, {
    email,
    userProfileId: userProfile?.id ?? null,
    firstName: userProfile?.first_name ?? firstName ?? null,
    lastName: userProfile?.last_name ?? lastName,
    orderId,
  })

  if (!client.ok) {
    return { ok: false, error: client.error, status: 500 }
  }

  return { ok: true, clientId: client.clientId, email: client.email }
}
