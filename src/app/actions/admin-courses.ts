'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error?: string; ok?: boolean }

/**
 * Sets published=false on a course. The brief calls this "archive" — we don't
 * have a separate archived column, so unpublished == archived from the admin
 * UI's perspective. The course row + its modules/lessons/enrollments are kept.
 */
export async function archiveCourse(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing course id.' }

  const supabase = await createClient()

  // The admin guard already checks role in proxy.ts + (dashboard)/layout.tsx,
  // but Postgres RLS will also reject if the caller is not an admin.
  const { error } = await supabase
    .from('courses')
    .update({ published: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/courses')
  revalidatePath('/admin')
  return { ok: true }
}

/** Re-publishes a course (sets published=true). Useful from the archived view. */
export async function publishCourse(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing course id.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('courses')
    .update({ published: true })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/courses')
  revalidatePath('/admin')
  return { ok: true }
}
