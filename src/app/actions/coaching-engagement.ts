'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { coachingToday } from '@/lib/coaching-engagement'
import { sendClientMessageNotification } from '@/lib/coaching-email'

type ActionResult = { ok: boolean; error?: string }

async function getOwnedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const admin = await createAdminClient()
  const { data: client } = await admin
    .from('coaching_clients')
    .select('id, user_id, first_name, email')
    .or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase()}`)
    .maybeSingle()

  if (!client) return null
  if (client.user_id && client.user_id !== user.id) return null
  return { admin, user, client }
}

const ToggleWinSchema = z.object({
  habitKey: z.string().trim().min(1).max(30).regex(/^[a-z-]+$/),
  done: z.boolean(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function toggleDailyWin(input: z.infer<typeof ToggleWinSchema>): Promise<ActionResult> {
  const parsed = ToggleWinSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid habit.' }

  const owned = await getOwnedClient()
  if (!owned) return { ok: false, error: 'Not a coaching client.' }
  const { admin, user, client } = owned

  // Only allow logging for today (coaching time zone) so streaks stay honest.
  const today = coachingToday()
  const logDate = parsed.data.logDate === today ? parsed.data.logDate : today

  const { data: existing } = await admin
    .from('coaching_daily_logs')
    .select('id, wins')
    .eq('coaching_client_id', client.id)
    .eq('log_date', logDate)
    .maybeSingle()

  const wins = { ...((existing?.wins ?? {}) as Record<string, boolean>), [parsed.data.habitKey]: parsed.data.done }

  const { error } = await admin
    .from('coaching_daily_logs')
    .upsert(
      {
        coaching_client_id: client.id,
        user_id: user.id,
        log_date: logDate,
        wins,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'coaching_client_id,log_date' }
    )

  if (error) return { ok: false, error: 'Could not save. Please try again.' }
  revalidatePath('/coaching/today')
  revalidatePath('/coaching/progress')
  return { ok: true }
}

const CheckInSchema = z.object({
  weight: z.string().trim().max(40).optional(),
  waist: z.string().trim().max(40).optional(),
  hips: z.string().trim().max(40).optional(),
  note: z.string().trim().max(1000).optional(),
})

export async function submitCheckIn(formData: FormData): Promise<ActionResult> {
  const parsed = CheckInSchema.safeParse({
    weight: String(formData.get('weight') ?? ''),
    waist: String(formData.get('waist') ?? ''),
    hips: String(formData.get('hips') ?? ''),
    note: String(formData.get('note') ?? ''),
  })
  if (!parsed.success) return { ok: false, error: 'Please check the form and try again.' }

  const { weight, waist, hips, note } = parsed.data
  if (!weight && !waist && !hips && !note) {
    return { ok: false, error: 'Add at least one measurement or a note.' }
  }

  const owned = await getOwnedClient()
  if (!owned) return { ok: false, error: 'Not a coaching client.' }
  const { admin, user, client } = owned

  const { error: logError } = await admin
    .from('coaching_progress_logs')
    .insert({
      coaching_client_id: client.id,
      user_id: user.id,
      logged_at: coachingToday(),
      weight: weight || null,
      waist: waist || null,
      hips: hips || null,
      notes: note || null,
    })
  if (logError) return { ok: false, error: 'Could not save your check-in. Please try again.' }

  const summary = [
    'Weekly check-in',
    weight ? `Weight: ${weight}` : null,
    waist ? `Waist: ${waist}` : null,
    hips ? `Hips: ${hips}` : null,
    note ? `"${note}"` : null,
  ].filter(Boolean).join('\n')

  await admin
    .from('coaching_messages')
    .insert({
      coaching_client_id: client.id,
      user_id: user.id,
      sender: 'client',
      body: summary,
      is_check_in: true,
    })

  await notifyCoach(admin, client, `${client.first_name ?? 'A client'} submitted a weekly check-in.`)

  revalidatePath('/coaching/coach')
  revalidatePath('/coaching/progress')
  return { ok: true }
}

const MessageSchema = z.object({ body: z.string().trim().min(1).max(4000) })

export async function sendClientMessage(formData: FormData): Promise<ActionResult> {
  const parsed = MessageSchema.safeParse({ body: String(formData.get('body') ?? '') })
  if (!parsed.success) return { ok: false, error: 'Write a message first.' }

  const owned = await getOwnedClient()
  if (!owned) return { ok: false, error: 'Not a coaching client.' }
  const { admin, user, client } = owned

  // Was the inbox already showing unread from this client before this message?
  const { count: unreadBefore } = await admin
    .from('coaching_messages')
    .select('id', { count: 'exact', head: true })
    .eq('coaching_client_id', client.id)
    .eq('sender', 'client')
    .is('read_by_coach_at', null)

  const { error } = await admin
    .from('coaching_messages')
    .insert({
      coaching_client_id: client.id,
      user_id: user.id,
      sender: 'client',
      body: parsed.data.body,
    })
  if (error) return { ok: false, error: 'Could not send. Please try again.' }

  // Email Laura only on the first unread message, not every follow-up.
  if ((unreadBefore ?? 0) === 0) {
    await notifyCoach(admin, client, `${client.first_name ?? 'A client'} sent you a new message.`)
  }

  revalidatePath('/coaching/coach')
  return { ok: true }
}

async function notifyCoach(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  client: { id: string; first_name: string | null; email: string },
  intro: string
) {
  try {
    await sendClientMessageNotification({
      clientName: [client.first_name].filter(Boolean).join(' ') || client.email,
      clientId: client.id,
      intro,
    })
  } catch {
    // Notification failures must never block the client's action.
  }
}
