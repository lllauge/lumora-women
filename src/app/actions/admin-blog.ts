'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit-log'

type ActionResult = { ok?: boolean; error?: string }

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized.')
  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') throw new Error('Unauthorized.')
  return { user, supabase }
}

export async function deleteBlogPost(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing post id.' }

  const { user, supabase } = await getAdminUser()

  const { data: old } = await supabase.from('blog_posts').select('title, slug').eq('id', id).maybeSingle()

  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return { error: error.message }

  await logAdminAction({
    adminUserId: user.id,
    action: 'delete',
    tableName: 'blog_posts',
    recordId: id,
    oldValues: old ?? undefined,
  })

  revalidatePath('/admin/blog')
  revalidatePath('/admin')
  revalidatePath('/blog')
  revalidatePath(`/blog/${id}`)
  return { ok: true }
}
