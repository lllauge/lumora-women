'use server'

import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/audit-log'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

type ActionResult = { ok?: boolean; error?: string }

export async function deleteBlogPost(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing post id.' }

  const { user, supabase } = await getVerifiedAdminUser()

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
