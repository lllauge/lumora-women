'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'
import { coachingToday, weekDates } from '@/lib/coaching-engagement'

const ReviewSchema = z.object({
  clientId: z.string().uuid(),
  whatISaw: z.string().trim().max(2000),
  whatChanged: z.string().trim().max(2000),
  focus: z.string().trim().max(2000),
})

/**
 * Upsert the coach's weekly review for the current week (Monday-keyed, one
 * per client per week). Saving again the same week edits the same review, so
 * Laura can refine it without stacking duplicates on the client's Today page.
 */
export async function saveCoachReview(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await getVerifiedAdminUser()
  } catch {
    return { ok: false, error: 'Unauthorized.' }
  }

  const parsed = ReviewSchema.safeParse({
    clientId: String(formData.get('clientId') ?? ''),
    whatISaw: String(formData.get('whatISaw') ?? ''),
    whatChanged: String(formData.get('whatChanged') ?? ''),
    focus: String(formData.get('focus') ?? ''),
  })
  if (!parsed.success) return { ok: false, error: 'Could not read the review fields.' }
  const { clientId, whatISaw, whatChanged, focus } = parsed.data
  if (!whatISaw && !whatChanged && !focus) {
    return { ok: false, error: 'Write at least one section before saving.' }
  }

  const admin = await createAdminClient()
  const { data: client } = await admin
    .from('coaching_clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return { ok: false, error: 'Client not found.' }

  const weekOf = weekDates(coachingToday())[0]
  const { error } = await admin
    .from('coaching_reviews')
    .upsert({
      coaching_client_id: client.id,
      week_of: weekOf,
      what_i_saw: whatISaw,
      what_changed: whatChanged,
      focus,
    }, { onConflict: 'coaching_client_id,week_of' })
  if (error) return { ok: false, error: 'Could not save the review. Please try again.' }

  revalidatePath(`/admin/coaching/${client.id}`)
  revalidatePath('/coaching/today')
  return { ok: true }
}
