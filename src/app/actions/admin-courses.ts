'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit-log'

type ActionResult = { error?: string; ok?: boolean }

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized.')
  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') throw new Error('Unauthorized.')
  return { user, supabase }
}

export async function archiveCourse(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing course id.' }

  const { user, supabase } = await getAdminUser()

  const { error } = await supabase
    .from('courses')
    .update({ published: false })
    .eq('id', id)

  if (error) return { error: error.message }

  await logAdminAction({
    adminUserId: user.id,
    action: 'update',
    tableName: 'courses',
    recordId: id,
    newValues: { published: false },
  })

  revalidatePath('/admin/courses')
  revalidatePath('/admin')
  return { ok: true }
}

export async function publishCourse(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing course id.' }

  const { user, supabase } = await getAdminUser()

  const { error } = await supabase
    .from('courses')
    .update({ published: true })
    .eq('id', id)

  if (error) return { error: error.message }

  await logAdminAction({
    adminUserId: user.id,
    action: 'update',
    tableName: 'courses',
    recordId: id,
    newValues: { published: true },
  })

  revalidatePath('/admin/courses')
  revalidatePath('/admin')
  return { ok: true }
}
