import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import { createAdminClient, createClient } from '@/lib/supabase/server'

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ preview?: string }>

type BlogPost = {
  id: string
  title: string
  slug: string
  body: string | null
  category: string | null
  featured_image_url: string | null
  published: boolean
  created_at: string
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
      .select('id, title, slug, body, category, featured_image_url, published, created_at')
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
  if (!post) return { title: 'Blog Post | Lumora Women' }

  return {
    title: `${post.title} | Lumora Women`,
    description: post.body?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155),
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

  return (
    <>
      <NavbarWrapper />
      <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '70vh' }}>
        <article style={{ maxWidth: '54rem', margin: '0 auto', padding: '5rem 1.25rem' }}>
          {preview === '1' && !post.published ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '999px',
                padding: '0.45rem 0.85rem',
                marginBottom: '1.5rem',
                background: 'var(--admin-sage-container, #EAF2E7)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Draft Preview
            </div>
          ) : null}

          {post.category ? (
            <p
              style={{
                margin: '0 0 0.9rem',
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--botanical-green)',
                textTransform: 'uppercase',
              }}
            >
              {post.category}
            </p>
          ) : null}

          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: 'clamp(2.65rem, 8vw, 4.75rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            {post.title}
          </h1>

          <p
            style={{
              margin: '1.25rem 0 2rem',
              fontFamily: 'var(--font-hanken)',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
            }}
          >
            {new Date(post.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>

          {post.featured_image_url ? (
            <img
              src={post.featured_image_url}
              alt=""
              style={{
                width: '100%',
                aspectRatio: '1200 / 630',
                objectFit: 'cover',
                borderRadius: '1.25rem',
                marginBottom: '2.5rem',
                border: '1px solid var(--outline-variant)',
              }}
            />
          ) : null}

          <div
            className="blog-post-body"
            dangerouslySetInnerHTML={{ __html: post.body ?? '' }}
          />
        </article>
      </main>
      <FooterWrapper />
    </>
  )
}
