import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sanitizeBlogHtml } from '@/lib/blog-html'

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ preview?: string }>

type BlogPost = {
  id: string
  title: string
  slug: string
  body: string | null
  category: string | null
  featured_image_url: string | null
  meta_description: string | null
  published: boolean
  created_at: string
}

function estimateReadingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

async function isAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return data?.role === 'admin'
}

async function loadPost(slug: string, preview: boolean): Promise<BlogPost | null> {
  if (preview && await isAdminUser()) {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('blog_posts')
      .select('id, title, slug, body, category, featured_image_url, meta_description, published, created_at')
      .eq('slug', slug)
      .maybeSingle<BlogPost>()
    return data ?? null
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, body, category, featured_image_url, published, created_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle<BlogPost>()

  return data ?? null
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const post = await loadPost(slug, false)
  if (!post) return { title: 'Blog Post' }

  const description = post.meta_description?.trim()
    || post.body?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155)
    || 'A note from Lumora Women.'
  const image = post.featured_image_url ?? undefined
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://lumorawomen.com'
  const canonical = `${siteUrl.replace(/\/$/, '')}/blog/${post.slug}`

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: canonical,
      siteName: 'Lumora Women',
      images: image ? [{ url: image, alt: post.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { slug } = await params
  const { preview } = await searchParams
  const post = await loadPost(slug, preview === '1')

  if (!post) notFound()

  const readTime = estimateReadingTime(post.body ?? '')
  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <NavbarWrapper />
      <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '80vh' }}>

        {/* ── Article header ───────────────────────────────────────── */}
        <header className="blog-article-header">
          <div className="blog-article-header__inner">

            {/* Back link */}
            <Link href="/blog" className="blog-back-link" aria-label="Back to all articles">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All Articles
            </Link>

            {/* Draft badge */}
            {preview === '1' && !post.published && (
              <span className="blog-draft-badge">Draft Preview</span>
            )}

            {/* Category */}
            {post.category && (
              <p className="blog-article-category">{post.category}</p>
            )}

            {/* Title */}
            <h1 className="blog-article-title">{post.title}</h1>

            {/* Meta line */}
            <div className="blog-article-meta">
              <time dateTime={post.created_at}>{formattedDate}</time>
              <span className="blog-article-meta__dot" aria-hidden="true" />
              <span>{readTime} min read</span>
            </div>
          </div>
        </header>

        {/* ── Article body ─────────────────────────────────────────── */}
        <div className="blog-article-body-wrap">
          <div
            className="blog-post-body blog-post-body--drop-cap"
            dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.body ?? '') }}
          />

          {/* ── Divider ──────────────────────────────────────────── */}
          <div className="blog-article-rule" aria-hidden="true">
            <span />
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="var(--botanical-green)" opacity="0.5"/>
            </svg>
            <span />
          </div>

          {/* ── End CTA ──────────────────────────────────────────── */}
          <div className="blog-end-cta">
            <p className="blog-end-cta__eyebrow">Keep reading</p>
            <h2 className="blog-end-cta__heading">Enjoyed this article?</h2>
            <p className="blog-end-cta__body">
              Get weekly insights on hormones, nutrition, and living well, delivered straight to your inbox.
            </p>
            <Link href="/blog" className="blog-end-cta__link">
              Browse more articles
            </Link>
          </div>
        </div>
      </main>
      <FooterWrapper />
    </>
  )
}
