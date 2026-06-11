'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'

const ReplySchema = z.object({
  clientId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
})

export async function sendCoachReply(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await getVerifiedAdminUser()
  } catch {
    return { ok: false, error: 'Unauthorized.' }
  }

  const parsed = ReplySchema.safeParse({
    clientId: String(formData.get('clientId') ?? ''),
    body: String(formData.get('body') ?? ''),
  })
  if (!parsed.success) return { ok: false, error: 'Write a message first.' }

  const admin = await createAdminClient()
  const { data: client } = await admin
    .from('coaching_clients')
    .select('id, user_id')
    .eq('id', parsed.data.clientId)
    .maybeSingle()
  if (!client) return { ok: false, error: 'Client not found.' }

  const { error } = await admin
    .from('coaching_messages')
    .insert({
      coaching_client_id: client.id,
      user_id: client.user_id,
      sender: 'coach',
      body: parsed.data.body,
    })
  if (error) return { ok: false, error: 'Could not send. Please try again.' }

  // Replying clears this client's unread state for the inbox badge.
  await admin
    .from('coaching_messages')
    .update({ read_by_coach_at: new Date().toISOString() })
    .eq('coaching_client_id', client.id)
    .eq('sender', 'client')
    .is('read_by_coach_at', null)

  revalidatePath('/admin/messages')
  return { ok: true }
}

export async function markThreadRead(clientId: string): Promise<void> {
  try {
    await getVerifiedAdminUser()
  } catch {
    return
  }
  if (!z.string().uuid().safeParse(clientId).success) return

  const admin = await createAdminClient()
  await admin
    .from('coaching_messages')
    .update({ read_by_coach_at: new Date().toISOString() })
    .eq('coaching_client_id', clientId)
    .eq('sender', 'client')
    .is('read_by_coach_at', null)
  revalidatePath('/admin/messages')
}
