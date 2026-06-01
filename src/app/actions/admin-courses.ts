'use server'

import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/audit-log'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

type ActionResult = { error?: string; ok?: boolean }

export async function archiveCourse(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing course id.' }

  const { user, supabase } = await getVerifiedAdminUser()

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

  const { user, supabase } = await getVerifiedAdminUser()

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

export async function deleteCourse(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing course id.' }

  const { user, supabase } = await getVerifiedAdminUser()

  const { data: old } = await supabase
    .from('courses')
    .select('title, price, is_free, published')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  await logAdminAction({
    adminUserId: user.id,
    action: 'delete',
    tableName: 'courses',
    recordId: id,
    oldValues: old ?? undefined,
  })

  revalidatePath('/admin/courses')
  revalidatePath('/admin')
  revalidatePath('/courses')
  revalidatePath(`/courses/${id}`)
  return { ok: true }
}
