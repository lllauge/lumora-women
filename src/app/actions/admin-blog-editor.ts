'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import slugify from 'slugify'
import { createClient } from '@/lib/supabase/server'
import { inferExtension, isR2Configured, uploadFileToR2 } from '@/lib/r2'
import { sanitizeBlogHtml } from '@/lib/blog-html'

// ─── Schema ───────────────────────────────────────────────────────────────────

const blogPostSchema = z.object({
  id: z.string().uuid().optional(),
  title:              z.string().min(1, 'Title is required').max(255),
  slug:               z.string().max(255).transform((value) =>
    slugify(value || '', { lower: true, strict: true, trim: true })
  ),
  body:               z.string().max(200_000).default(''),
  category:           z.string().max(120).nullable().optional().default(null),
  featured_image_url: z.string().max(2048).nullable().optional().default(null),
}).superRefine((draft, ctx) => {
  if (!draft.slug) {
    ctx.addIssue({
      code: 'custom',
      path: ['slug'],
      message: 'Slug is required.',
    })
  }
})

export type BlogPostDraft = z.infer<typeof blogPostSchema>

export type BlogAction =
  | { kind: 'draft' }
  | { kind: 'publish' }
  | { kind: 'schedule'; at: string /* ISO timestamp */ }

type SaveResult =
  | { ok: true;  postId: string; slug: string; action: BlogAction['kind'] }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; missingScheduleColumns?: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function generateUniqueSlug(title: string, ignoreId?: string): Promise<string> {
  const base = slugify(title || 'untitled', { lower: true, strict: true, trim: true }) || 'untitled'
  const supabase = await createClient()

  let candidate = base
  let attempt = 1
  while (attempt < 100) {
    const { data } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data || (ignoreId && data.id === ignoreId)) return candidate
    attempt++
    candidate = `${base}-${attempt}`
  }
  return `${base}-${Date.now().toString(36)}`
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export async function saveBlogPost(
  rawDraft: unknown,
  action: BlogAction
): Promise<SaveResult> {
  const parsed = blogPostSchema.safeParse(rawDraft)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }
  const draft = parsed.data
  const supabase = await createClient()

  // Resolve slug uniqueness server-side (in case the user didn't override)
  let slug = draft.slug.trim()
  if (!slug || slug === 'untitled') {
    slug = await generateUniqueSlug(draft.title, draft.id)
  } else if (!draft.id) {
    // For new posts, make sure the requested slug is free
    const { data: clash } = await supabase
      .from('blog_posts').select('id').eq('slug', slug).maybeSingle()
    if (clash) {
      slug = await generateUniqueSlug(draft.title, draft.id)
    }
  }

  // Decide flags + timestamps from the action
  const now = new Date().toISOString()
  let published = false
  let published_at: string | null = null
  let scheduled_at: string | null = null

  if (action.kind === 'publish') {
    published = true
    published_at = now
    scheduled_at = null
  } else if (action.kind === 'schedule') {
    if (!action.at || Number.isNaN(Date.parse(action.at))) {
      return { ok: false, error: 'Invalid schedule date.' }
    }
    if (new Date(action.at).getTime() <= Date.now()) {
      return { ok: false, error: 'Schedule date must be in the future.' }
    }
    published = false
    published_at = null
    scheduled_at = action.at
  } else {
    // Draft — clear published_at + scheduled_at to avoid stale data
    published = false
    published_at = null
    scheduled_at = null
  }

  const corePayload = {
    title:              draft.title.trim(),
    slug,
    body:               sanitizeBlogHtml(draft.body ?? ''),
    category:           draft.category?.trim() || null,
    featured_image_url: draft.featured_image_url?.trim() || null,
    published,
  }

  // Try inserting scheduling cols. If the column doesn't exist (v3 not run yet),
  // retry without them and warn the caller.
  const payloadWithSchedule = { ...corePayload, published_at, scheduled_at }

  let postId: string
  if (draft.id) {
    let { error } = await supabase.from('blog_posts').update(payloadWithSchedule).eq('id', draft.id)
    if (error && isMissingScheduleColumnError(error.message)) {
      ;({ error } = await supabase.from('blog_posts').update(corePayload).eq('id', draft.id))
      if (error) return { ok: false, error: `Could not update post: ${error.message}` }
      postId = draft.id
      revalidateBlogPaths(postId, slug)
      return { ok: true, postId, slug, action: action.kind, ...{ missingScheduleColumns: true } as object } as unknown as SaveResult
    }
    if (error) return { ok: false, error: `Could not update post: ${error.message}` }
    postId = draft.id
  } else {
    let { data, error } = await supabase
      .from('blog_posts')
      .insert(payloadWithSchedule)
      .select('id')
      .single()
    if (error && isMissingScheduleColumnError(error.message)) {
      ;({ data, error } = await supabase
        .from('blog_posts')
        .insert(corePayload)
        .select('id')
        .single())
      if (error || !data) return { ok: false, error: `Could not create post: ${error?.message ?? 'unknown'}` }
      postId = data.id
      revalidateBlogPaths(postId, slug)
      return { ok: true, postId, slug, action: action.kind, ...{ missingScheduleColumns: true } as object } as unknown as SaveResult
    }
    if (error || !data) return { ok: false, error: `Could not create post: ${error?.message ?? 'unknown'}` }
    postId = data.id
  }

  revalidateBlogPaths(postId, slug)
  return { ok: true, postId, slug, action: action.kind }
}

function isMissingScheduleColumnError(msg: string): boolean {
  // Postgres: 'column "published_at" of relation "blog_posts" does not exist'
  // PostgREST schema cache: "Could not find the 'published_at' column of 'blog_posts' in the schema cache"
  return (
    /column.*['"]?(published_at|scheduled_at)['"]?.*does not exist/i.test(msg) ||
    /could not find.*['"]?(published_at|scheduled_at)['"]?.*schema cache/i.test(msg)
  )
}

function revalidateBlogPaths(postId: string, slug: string) {
  revalidatePath('/admin/blog')
  revalidatePath(`/admin/blog/edit/${postId}`)
  revalidatePath('/admin')
  revalidatePath('/blog')
  revalidatePath(`/blog/${slug}`)
}

// ─── Asset upload (featured images + inline editor images) ───────────────────

export type UploadBlogAssetResult =
  | { ok: true;  url: string; name: string; size: number; contentType: string }
  | { ok: false; error: string; r2Configured: boolean }

export async function uploadBlogAsset(formData: FormData): Promise<UploadBlogAssetResult> {
  const file   = formData.get('file')
  const kind   = (formData.get('kind') ?? '').toString()
  const postId = (formData.get('postId') ?? '').toString() || 'unfiled'

  if (!(file instanceof File))      return { ok: false, error: 'No file received.', r2Configured: isR2Configured() }
  if (file.size === 0)              return { ok: false, error: 'File is empty.',    r2Configured: isR2Configured() }
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: 'Image too large (20 MB max).', r2Configured: isR2Configured() }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Featured image must be a JPG, PNG, or WEBP.', r2Configured: isR2Configured() }
  }
  if (kind !== 'featured' && kind !== 'inline') {
    return { ok: false, error: 'Invalid upload kind.', r2Configured: isR2Configured() }
  }

  const ext = inferExtension(file)
  const folder = kind === 'featured'
    ? `blog/${postId}/featured`
    : `blog/${postId}/inline`
  const key = `${folder}/${randomUUID()}.${ext}`

  const result = await uploadFileToR2(file, key)
  if (!result.ok) return { ok: false, error: result.error, r2Configured: isR2Configured() }

  return {
    ok: true,
    url: result.url,
    name: file.name,
    size: result.size,
    contentType: result.contentType,
  }
}

// ─── Delete (called from edit page header) ───────────────────────────────────

export async function deleteBlogPostFromEditor(formData: FormData) {
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { ok: false, error: 'Missing post id.' }
  const supabase = await createClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/blog')
  return { ok: true }
}
