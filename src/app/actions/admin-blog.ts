'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { ok?: boolean; error?: string }

/**
 * Permanently deletes a blog post. Per the brief, this is a hard delete after
 * a confirmation dialog (handled client-side). Admin RLS policies in the
 * schema gate this; the proxy already verified role.
 */
export async function deleteBlogPost(formData: FormData): Promise<ActionResult> {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { error: 'Missing post id.' }

  const supabase = await createClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/blog')
  revalidatePath('/admin')        // dashboard activity feed
  revalidatePath('/blog')         // public blog index
  revalidatePath(`/blog/${id}`)   // public post page (best effort)
  return { ok: true }
}
