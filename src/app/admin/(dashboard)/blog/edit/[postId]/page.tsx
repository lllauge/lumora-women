import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BlogPostEditor, { type BlogPostInitial } from '@/components/admin/blog-editor/BlogPostEditor'
import { isR2Configured } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'
import { isSchedulingAvailable } from '@/lib/blog-schema'

export const metadata: Metadata = {
  title: 'Edit Blog Post',
  robots: { index: false, follow: false },
}

type Params = Promise<{ postId: string }>

type BlogPostRow = {
  id: string
  title: string
  slug: string
  body: string | null
  category: string | null
  featured_image_url: string | null
  meta_description: string | null
  published: boolean
  published_at?: string | null
  scheduled_at?: string | null
}

async function loadPost(postId: string, schedulingAvailable: boolean): Promise<BlogPostInitial | null> {
  const supabase = await createClient()

  const columns = schedulingAvailable
    ? 'id, title, slug, body, category, featured_image_url, meta_description, published, published_at, scheduled_at'
    : 'id, title, slug, body, category, featured_image_url, meta_description, published'

  const { data, error } = await supabase
    .from('blog_posts')
    .select(columns)
    .eq('id', postId)
    .maybeSingle<BlogPostRow>()

  if (error || !data) return null

  return {
    id:                 data.id,
    title:              data.title,
    slug:               data.slug,
    body:               data.body ?? '',
    category:           data.category ?? null,
    featured_image_url: data.featured_image_url ?? null,
    meta_description:   data.meta_description ?? null,
    published:          data.published,
    published_at:       data.published_at ?? null,
    scheduled_at:       data.scheduled_at ?? null,
  }
}

export default async function EditBlogPostPage({ params }: { params: Params }) {
  const { postId } = await params

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseConfigured) return notFound()

  const scheduling = await isSchedulingAvailable()
  const initial = await loadPost(postId, scheduling)
  if (!initial) return notFound()

  return (
    <BlogPostEditor
      mode="edit"
      r2Configured={isR2Configured()}
      schedulingAvailable={scheduling}
      initial={initial}
    />
  )
}
