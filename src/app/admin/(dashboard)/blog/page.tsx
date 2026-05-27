import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Pencil, Mail, FileText, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCompact, formatNumber, formatShortDate } from '@/utils/format'
import BlogFilters from '@/components/admin/BlogFilters'
import DeleteBlogPostButton from '@/components/admin/DeleteBlogPostButton'

export const metadata: Metadata = {
  title: 'Blog Manager',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 10

type SearchParams = Promise<{
  q?: string
  status?: string
  page?: string
}>

type PostRow = {
  id: string
  title: string
  slug: string
  body: string | null
  category: string | null
  featured_image_url: string | null
  published: boolean
  created_at: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function loadPosts(sp: Awaited<SearchParams>) {
  const supabase = await createClient()

  const q      = (sp.q ?? '').trim()
  const status = (sp.status ?? 'all').toLowerCase()
  const page   = Math.max(1, Number(sp.page ?? '1') || 1)
  const from   = (page - 1) * PAGE_SIZE
  const to     = from + PAGE_SIZE - 1

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, body, category, featured_image_url, published, created_at',
            { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q)                       query = query.ilike('title', `%${q}%`)
  if (status === 'published')  query = query.eq('published', true)
  else if (status === 'draft') query = query.eq('published', false)

  const { data, count } = await query.range(from, to)
  return {
    posts: (data ?? []) as PostRow[],
    total: count ?? 0,
    page,
    filters: { q, status },
  }
}

async function loadInsights() {
  const supabase = await createClient()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [postsTotalQ, postsPublishedQ, subscribersTotalQ, subscribersThisWeekQ] =
    await Promise.all([
      supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
      supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('published', true),
      supabase.from('email_subscribers').select('id', { count: 'exact', head: true }),
      supabase.from('email_subscribers').select('id', { count: 'exact', head: true })
        .gte('subscribed_at', weekAgo.toISOString()),
    ])

  const total       = postsTotalQ.count ?? 0
  const published   = postsPublishedQ.count ?? 0
  const subscribers = subscribersTotalQ.count ?? 0
  const thisWeek    = subscribersThisWeekQ.count ?? 0
  const publishedRatio = total > 0 ? Math.round((published / total) * 100) : 0

  return { total, published, publishedRatio, subscribers, thisWeek }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function StatusPill({ published }: { published: boolean }) {
  const isPub = published
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
      style={{
        background: isPub ? 'var(--admin-sage-container)' : 'var(--admin-surface-high)',
        color:      isPub ? 'var(--admin-on-sage-container)' : 'var(--admin-on-surface-variant)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: isPub ? 'var(--admin-primary-container)' : 'var(--admin-outline)' }}
      />
      {isPub ? 'Published' : 'Draft'}
    </div>
  )
}

function CategoryPill({ category }: { category: string | null }) {
  if (!category) {
    return (
      <span style={{ color: 'var(--admin-on-surface-variant)', fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem' }}>
        —
      </span>
    )
  }
  return (
    <span
      className="px-3 py-1 rounded-full"
      style={{
        background: 'var(--admin-rose-fixed)',
        color: 'var(--admin-on-rose-fixed)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      {category}
    </span>
  )
}

/** Crude reading-time estimate: ~200 words/min, stripping HTML/Markdown. */
function readingTime(body: string | null): number | null {
  if (!body) return null
  const plain = body.replace(/<[^>]*>/g, ' ').replace(/[#*_>`~\[\]()]/g, ' ')
  const words = plain.split(/\s+/).filter(Boolean).length
  if (words === 0) return null
  return Math.max(1, Math.round(words / 200))
}

function PostInfoCell({ post }: { post: PostRow }) {
  const minutes = readingTime(post.body)
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: 'var(--admin-surface-container)' }}
      >
        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.125rem',
            color: 'var(--admin-outline-variant)',
          }}>L</span>
        )}
      </div>
      <div className="min-w-0">
        <Link
          href={`/admin/blog/edit/${post.id}`}
          className="hover:underline"
          style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.0625rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
            textDecoration: 'none',
            display: 'block',
            lineHeight: 1.2,
          }}
        >
          {post.title}
        </Link>
        <p
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
            marginTop: '0.25rem',
            marginBottom: 0,
          }}
        >
          /{post.slug}
          {minutes ? <> · {minutes} min read</> : null}
        </p>
      </div>
    </div>
  )
}

function Pagination({
  page, total, filters,
}: {
  page: number
  total: number
  filters: { q: string; status: string }
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (total === 0) return null

  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (filters.q)                params.set('q', filters.q)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (p > 1)                    params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/blog?${qs}` : '/admin/blog'
  }

  const pageSet = new Set<number>([1, totalPages, page, page - 1, page + 1])
  const pageList = Array.from(pageSet).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const items: Array<number | 'gap'> = []
  let prev = 0
  for (const p of pageList) {
    if (prev && p - prev > 1) items.push('gap')
    items.push(p)
    prev = p
  }

  return (
    <div
      className="px-6 py-4 flex items-center justify-between"
      style={{ background: 'var(--admin-surface-low)' }}
    >
      <p style={{
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.8125rem',
        color: 'var(--admin-on-surface-variant)',
      }}>
        Showing {formatNumber(start)} to {formatNumber(end)} of {formatNumber(total)} {total === 1 ? 'post' : 'posts'}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} aria-label="Previous page"
                className="p-2 rounded-lg transition-colors"
                style={{ border: '1px solid var(--admin-outline-variant)', background: 'var(--admin-surface)' }}>
            <ChevronLeft size={18} />
          </Link>
        ) : (
          <span className="p-2 opacity-30" style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: '0.5rem' }}>
            <ChevronLeft size={18} />
          </span>
        )}
        {items.map((it, i) =>
          it === 'gap' ? (
            <span key={`gap-${i}`} className="px-1" style={{ color: 'var(--admin-on-surface-variant)' }}>…</span>
          ) : it === page ? (
            <span
              key={it}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg"
              style={{
                background: 'var(--admin-primary-container)',
                color: 'var(--admin-bg)',
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.875rem',
                fontWeight: 700,
              }}
            >
              {it}
            </span>
          ) : (
            <Link
              key={it}
              href={buildHref(it)}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg transition-colors"
              style={{
                border: '1px solid var(--admin-outline-variant)',
                background: 'var(--admin-surface)',
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              {it}
            </Link>
          )
        )}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} aria-label="Next page"
                className="p-2 rounded-lg transition-colors"
                style={{ border: '1px solid var(--admin-outline-variant)', background: 'var(--admin-surface)' }}>
            <ChevronRight size={18} />
          </Link>
        ) : (
          <span className="p-2 opacity-30" style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: '0.5rem' }}>
            <ChevronRight size={18} />
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminBlogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const empty = {
    posts: [] as PostRow[], total: 0, page: 1,
    filters: { q: sp.q ?? '', status: sp.status ?? 'all' },
  }
  const emptyInsights = { total: 0, published: 0, publishedRatio: 0, subscribers: 0, thisWeek: 0 }

  const [data, insights] = supabaseConfigured
    ? await Promise.all([loadPosts(sp), loadInsights()])
    : [empty, emptyInsights]

  const { posts, total, page, filters } = data

  return (
    <div className="space-y-6">

      <BlogFilters />

      {/* Table card */}
      <div className="admin-card overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Post Info</th>
                <th>Category</th>
                <th>Status</th>
                <th>Publish Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <p style={{
                      fontFamily: 'var(--font-eb-garamond)',
                      fontSize: '1.125rem',
                      color: 'var(--admin-on-surface-variant)',
                    }}>
                      {filters.q || filters.status !== 'all'
                        ? 'No posts match those filters.'
                        : 'No posts yet — write your first one.'}
                    </p>
                    <Link href="/admin/blog/new" className="admin-btn-primary mt-4 inline-flex">
                      + Create New Post
                    </Link>
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="group">
                    <td><PostInfoCell post={post} /></td>
                    <td><CategoryPill category={post.category} /></td>
                    <td><StatusPill published={post.published} /></td>
                    <td style={{ color: 'var(--admin-on-surface-variant)' }}>
                      {post.published
                        ? formatShortDate(post.created_at)
                        : <span>—</span>}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/blog/edit/${post.id}`}
                          aria-label={`Edit ${post.title}`}
                          title="Edit"
                          className="p-2 rounded-full transition-colors"
                          style={{ color: 'var(--admin-on-surface-variant)' }}
                        >
                          <Pencil size={18} />
                        </Link>
                        <DeleteBlogPostButton postId={post.id} postTitle={post.title} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} filters={filters} />
      </div>

      {/* ── Insight cards (bento) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">

        {/* Total Posts — dark forest */}
        <div
          className="p-6 rounded-xl flex flex-col justify-between relative overflow-hidden"
          style={{
            background: 'var(--admin-primary-container)',
            color: 'var(--admin-bg)',
            minHeight: '160px',
          }}
        >
          <div className="relative z-10">
            <p className="uppercase" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              opacity: 0.7,
            }}>
              Total Posts
            </p>
            <h3 className="mt-2" style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '2.25rem',
              fontWeight: 500,
              color: 'var(--admin-bg)',
              lineHeight: 1.1,
            }}>
              {formatNumber(insights.total)}
            </h3>
          </div>
          <div className="relative z-10 mt-4 flex items-center gap-2" style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--admin-celadon)',
          }}>
            <FileText size={16} />
            <span>{insights.published} published, {insights.total - insights.published} draft</span>
          </div>
          <FileText
            size={120}
            style={{
              position: 'absolute',
              right: '-16px',
              bottom: '-16px',
              color: 'var(--admin-celadon)',
              opacity: 0.08,
            }}
          />
        </div>

        {/* Published ratio — white */}
        <div className="admin-card p-6 flex flex-col justify-between" style={{ minHeight: '160px' }}>
          <div>
            <p className="uppercase" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'var(--admin-on-surface-variant)',
            }}>
              Publish Ratio
            </p>
            <h3 className="mt-2" style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '2.25rem',
              fontWeight: 500,
              color: 'var(--admin-primary-container)',
              lineHeight: 1.1,
            }}>
              {insights.publishedRatio}%
            </h3>
          </div>
          <div className="mt-4">
            <div className="w-full rounded-full overflow-hidden"
                 style={{ background: 'var(--admin-surface-high)', height: '6px' }}>
              <div className="h-full rounded-full"
                   style={{
                     width: `${insights.publishedRatio}%`,
                     background: 'var(--admin-primary-container)',
                   }} />
            </div>
            <p className="mt-2 flex items-center gap-2" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--admin-on-surface-variant)',
            }}>
              <TrendingUp size={14} />
              {insights.total === 0
                ? 'Write your first post to start tracking'
                : `${insights.published} of ${insights.total} posts live`}
            </p>
          </div>
        </div>

        {/* Newsletter opt-ins — sage */}
        <div
          className="p-6 rounded-xl flex flex-col justify-between relative overflow-hidden"
          style={{ background: 'var(--admin-sage-container)', minHeight: '160px' }}
        >
          <div className="relative z-10">
            <p className="uppercase" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'var(--admin-on-sage-container)',
            }}>
              Newsletter Opt-ins
            </p>
            <h3 className="mt-2" style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '2.25rem',
              fontWeight: 500,
              color: 'var(--admin-primary-container)',
              lineHeight: 1.1,
            }}>
              {formatCompact(insights.subscribers)}
            </h3>
          </div>
          <div className="relative z-10 mt-4 flex items-center gap-2" style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--admin-primary-container)',
          }}>
            <Mail size={16} />
            <span>
              {insights.thisWeek > 0
                ? `+${insights.thisWeek} this week`
                : 'No new signups this week'}
            </span>
          </div>
          <div
            className="absolute rounded-full"
            style={{
              right: '-32px', top: '-32px',
              width: '96px', height: '96px',
              background: 'rgba(255,255,255,0.25)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
