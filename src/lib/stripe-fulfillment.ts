import Stripe from 'stripe'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { getCourseStartPath, sendCourseAccessEmail } from '@/lib/course-access'

const CheckoutMetadataSchema = z.object({
  courseId: z.string().uuid(),
  userId: z.string().uuid(),
})

export type FulfillmentResult =
  | { ok: true; courseId: string; userId: string; orderCreated: boolean; startPath: string }
  | { ok: false; error: string; status?: number }

export async function fulfillPaidCourseCheckout(
  session: Stripe.Checkout.Session,
  expectedUserId?: string
): Promise<FulfillmentResult> {
  const parsed = CheckoutMetadataSchema.safeParse(session.metadata ?? {})
  if (!parsed.success) {
    return { ok: false, error: 'Missing or invalid checkout metadata.', status: 400 }
  }

  const { courseId, userId } = parsed.data

  if (expectedUserId && expectedUserId !== userId) {
    return { ok: false, error: 'This checkout session belongs to another account.', status: 403 }
  }

  if (session.payment_status !== 'paid') {
    return { ok: false, error: 'Payment has not been completed yet.', status: 409 }
  }

  const stripePaymentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id

  const supabase = await createAdminClient()

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_payment_id', stripePaymentId)
    .maybeSingle()

  if (existingOrderError) {
    return { ok: false, error: existingOrderError.message, status: 500 }
  }

  let orderCreated = false
  if (!existingOrder) {
    const { error: orderError } = await supabase.from('orders').insert({
      user_id: userId,
      course_id: courseId,
      stripe_payment_id: stripePaymentId,
      amount: (session.amount_total ?? 0) / 100,
      status: 'paid',
    })

    if (orderError) {
      return { ok: false, error: orderError.message, status: 500 }
    }

    orderCreated = true
  }

  const { error: enrollmentError } = await supabase
    .from('enrollments')
    .upsert(
      { user_id: userId, course_id: courseId },
      { onConflict: 'user_id,course_id' }
    )

  if (enrollmentError) {
    return { ok: false, error: enrollmentError.message, status: 500 }
  }

  if (orderCreated) {
    try {
      await sendCourseAccessEmail(supabase, { userId, courseId })
    } catch (err) {
      console.error('[stripe fulfillment] course access email failed:', err)
    }
  }

  const startPath = await getCourseStartPath(supabase, courseId)
  return { ok: true, courseId, userId, orderCreated, startPath }
}
