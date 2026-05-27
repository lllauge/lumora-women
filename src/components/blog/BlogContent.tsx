'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Post = {
  id: string
  title: string
  slug: string
  body: string | null
  category: string | null
  featured_image_url: string | null
  published: boolean
  created_at: string
}

const CATEGORIES = ['All', 'Hormone Health', 'Postpartum', 'Mindset', 'Nutrition', 'Movement']
const PAGE_SIZE = 9

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function excerpt(body: string | null, max = 120) {
  if (!body) return ''
  const plain = body.replace(/<[^>]+>/g, '')
  return plain.length > max ? plain.slice(0, max).trim() + '…' : plain
}

export default function BlogContent() {
  const [featured, setFeatured]       = useState<Post | null>(null)
  const [posts, setPosts]             = useState<Post[]>([])
  const [popular, setPopular]         = useState<Post[]>([])
  const [category, setCategory]       = useState('All')
  const [page, setPage]               = useState(0)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [email, setEmail]             = useState('')
  const [subStatus, setSubStatus]     = useState<'idle' | 'ok' | 'err'>('idle')

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      setLoading(true)

      const { data: featuredData } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setFeatured(featuredData ?? null)

      const { data: popularData } = await supabase
        .from('blog_posts')
        .select('id, title, slug, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3)
      setPopular((popularData ?? []) as Post[])

      setLoading(false)
    }

    load()
  }, [])

  const fetchPosts = useCallback(async (cat: string, pageNum: number, append: boolean) => {
    const supabase = createClient()
    let q = supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE)

    if (cat !== 'All') q = q.eq('category', cat)

    const { data } = await q
    const newPosts = (data ?? []) as Post[]

    if (append) {
      setPosts((prev) => [...prev, ...newPosts])
    } else {
      setPosts(newPosts)
    }
    setHasMore(newPosts.length === PAGE_SIZE + 1)
    if (newPosts.length === PAGE_SIZE + 1) {
      setPosts((prev) => (append ? prev.slice(0, -1) : prev.slice(0, PAGE_SIZE)))
    }
  }, [])

  useEffect(() => {
    fetchPosts(category, 0, false)
    setPage(0)
  }, [category, fetchPosts])

  async function loadMore() {
    setLoadingMore(true)
    const next = page + 1
    await fetchPosts(category, next, true)
    setPage(next)
    setLoadingMore(false)
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    const supabase = createClient()
    const { error } = await supabase
      .from('email_subscribers')
      .upsert({ email, source: 'Blog Page' } as never, { onConflict: 'email' })
    setSubStatus(error ? 'err' : 'ok')
    if (!error) setEmail('')
  }

  return (
    <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{
        background: 'var(--section-tint)',
        padding: '5rem 1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--botanical-green)',
            display: 'block',
            marginBottom: '1rem',
          }}>
            Reflections &amp; Rituals
          </span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            marginBottom: '1.25rem',
          }}>
            The Journal
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1.0625rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '36rem',
            margin: '0 auto',
          }}>
            Deep dives into holistic health, conscious living, and the art of modern sanctuary.
            Curated wisdom for the intentional woman.
          </p>
        </div>
      </section>

      {/* ── Category Tabs ── */}
      <section style={{ background: '#fff', borderBottom: '1px solid rgba(200,220,192,0.35)', position: 'sticky', top: '64px', zIndex: 40 }}>
        <div
          role="tablist"
          aria-label="Filter posts by category"
          style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1.5rem', display: 'flex', gap: '0', overflowX: 'auto' }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={category === cat}
              aria-controls="blog-post-grid"
              id={`blog-tab-${cat.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => setCategory(cat)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                fontWeight: category === cat ? 600 : 500,
                color: category === cat ? 'var(--botanical-green)' : 'var(--text-secondary)',
                padding: '1rem 1.25rem',
                background: 'none',
                border: 'none',
                borderBottom: category === cat ? '2px solid var(--botanical-green)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
                minHeight: '44px',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '3rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>
        <div className="blog-main-grid">

          {/* ── Left: featured + grid ── */}
          <div
            role="tabpanel"
            id="blog-post-grid"
            aria-labelledby={`blog-tab-${category.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {/* Featured Post */}
            {loading ? (
              <div style={{ height: '400px', background: 'var(--section-tint)', borderRadius: '1rem', marginBottom: '3rem' }} />
            ) : featured ? (
              <Link href={`/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '3rem' }}>
                <article style={{
                  background: '#fff',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  boxShadow: '0 12px 24px rgba(22,40,20,0.07)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                }}>
                  {/* Gold top line */}
                  <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
                  {/* Image */}
                  <div style={{ height: '320px', background: 'var(--pale-botanical)', position: 'relative', overflow: 'hidden' }}>
                    {featured.featured_image_url ? (
                      <img src={featured.featured_image_url} alt={`Featured image for: ${featured.title}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--botanical-green)', opacity: 0.4 }} aria-hidden="true">L</span>
                      </div>
                    )}
                    <span style={{
                      position: 'absolute', top: '1rem', left: '1rem',
                      background: '#162814', color: '#fff',
                      fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '0.375rem 0.75rem', borderRadius: '999px',
                    }}>
                      Featured
                    </span>
                  </div>
                  <div style={{ padding: '2rem' }}>
                    {featured.category && (
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: 'var(--botanical-green)', display: 'block', marginBottom: '0.75rem',
                      }}>
                        {featured.category}
                      </span>
                    )}
                    <h2 style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 700,
                      color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '0.75rem',
                    }}>
                      {featured.title}
                    </h2>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
                      color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem',
                    }}>
                      {excerpt(featured.body, 180)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {formatDate(featured.created_at)}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
                        color: 'var(--botanical-green)', display: 'flex', alignItems: 'center', gap: '0.375rem',
                      }}>
                        Read More →
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ) : null}

            {/* Post Grid */}
            {posts.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                No posts in this category yet.
              </div>
            ) : (
              <div className="blog-grid">
                {posts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                    <article style={{
                      background: '#fff',
                      borderRadius: '0.875rem',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(22,40,20,0.05)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'box-shadow 0.2s, transform 0.2s',
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(22,40,20,0.12)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,40,20,0.05)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      {/* Gold top line */}
                      <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)', flexShrink: 0 }} />
                      {/* Image */}
                      <div style={{ height: '200px', background: 'var(--pale-botanical)', overflow: 'hidden' }}>
                        {post.featured_image_url ? (
                          <img src={post.featured_image_url} alt={`Featured image for: ${post.title}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--botanical-green)', opacity: 0.4 }} aria-hidden="true">L</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {post.category && (
                          <span style={{
                            fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: 'var(--botanical-green)', display: 'block', marginBottom: '0.5rem',
                          }}>
                            {post.category}
                          </span>
                        )}
                        <h3 style={{
                          fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700,
                          color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '0.625rem', flex: 1,
                        }}>
                          {post.title}
                        </h3>
                        <p style={{
                          fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                          color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem',
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {excerpt(post.body)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDate(post.created_at)}
                          </span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--botanical-green)' }}>
                            Read →
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600,
                    padding: '0.875rem 2.5rem', borderRadius: '999px',
                    border: '2px solid var(--dark-card-bg)',
                    background: 'transparent', color: 'var(--dark-card-bg)',
                    cursor: loadingMore ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: loadingMore ? 0.6 : 1,
                    minHeight: '44px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--dark-card-bg)'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--dark-card-bg)'
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load More Posts'}
                </button>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside>
            {/* Newsletter */}
            <div style={{
              background: '#162814',
              borderRadius: '1rem',
              overflow: 'hidden',
              marginBottom: '2rem',
            }}>
              <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
              <div style={{ padding: '1.75rem' }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700,
                  color: '#FFFFFF', marginBottom: '0.5rem',
                }}>
                  The Weekly Glow
                </h2>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                  color: 'rgba(200,220,192,0.75)', lineHeight: 1.6, marginBottom: '1.25rem',
                }}>
                  Curated wellness wisdom delivered to your inbox every Sunday morning.
                </p>

                {subStatus === 'ok' ? (
                  <p role="status" aria-live="polite" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--botanical-light)', textAlign: 'center' }}>
                    ✓ You&apos;re on the list!
                  </p>
                ) : (
                  <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label htmlFor="blog-newsletter-email" className="sr-only">Email address</label>
                    <input
                      id="blog-newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address"
                      required
                      aria-required="true"
                      style={{
                        fontFamily: 'var(--font-sans)', fontSize: '1rem',
                        padding: '0.75rem 1rem', borderRadius: '0.5rem',
                        border: 'none', background: 'rgba(255,255,255,0.1)',
                        color: '#fff', minHeight: '44px',
                      }}
                    />
                    <button type="submit" className="btn-primary" style={{ borderRadius: '0.5rem', padding: '0.75rem', minHeight: '44px' }}>
                      Subscribe
                    </button>
                    {subStatus === 'err' && (
                      <p role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--botanical-light)' }}>
                        Something went wrong. Try again.
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>

            {/* Popular Posts */}
            <div style={{ background: '#fff', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(22,40,20,0.05)' }}>
              <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
              <div style={{ padding: '1.75rem' }}>
                <h2 style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginBottom: '1.25rem',
                  paddingBottom: '0.75rem', borderBottom: '1px solid rgba(200,220,192,0.35)',
                }}>
                  Popular Now
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {popular.length === 0 ? (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No posts yet.</p>
                  ) : popular.map((post, i) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
                          lineHeight: 1, flexShrink: 0, width: '1.5rem',
                          background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p style={{
                          fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
                          color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.25rem',
                        }}>
                          {post.title}
                        </p>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Featured Course CTA */}
            <div style={{
              background: '#1E3220', borderRadius: '1rem',
              overflow: 'hidden', marginTop: '2rem', textAlign: 'center',
            }}>
              <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
              <div style={{ padding: '1.75rem' }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700,
                  color: '#fff', marginBottom: '0.5rem',
                }}>
                  Start Your Wellness Journey
                </h2>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                  color: 'rgba(200,220,192,0.8)', lineHeight: 1.6, marginBottom: '1.25rem',
                }}>
                  Get instant access to our free foundational course.
                </p>
                <Link href="/free-course" className="btn-primary" style={{ display: 'block', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  Get Free Access →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>


      <style>{`
        .blog-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
        }
        @media (min-width: 1024px) {
          .blog-main-grid {
            grid-template-columns: 1fr 320px;
          }
        }
        .blog-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .blog-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .blog-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </main>
  )
}
