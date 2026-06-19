'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit-log'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

export async function deleteCoachingClient(formData: FormData) {
  const { user } = await getVerifiedAdminUser()
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { ok: false, error: 'Missing client id.' }

  const supabase = await createClient()

  const { data: old } = await supabase
    .from('coaching_clients')
    .select('email, first_name, last_name, coaching_order_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('coaching_clients').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  await logAdminAction({
    adminUserId: user.id,
    action: 'delete',
    tableName: 'coaching_clients',
    recordId: id,
    oldValues: old ?? undefined,
  })

  revalidatePath('/admin/coaching')
  revalidatePath('/admin/today')
  revalidatePath('/admin')
  return { ok: true }
}
