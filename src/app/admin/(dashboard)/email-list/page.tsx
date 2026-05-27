import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  currentMonthRange,
  formatCompact,
  formatNumber,
  formatShortDate,
  formatTrendPercent,
  previousMonthRange,
} from '@/utils/format'
import EmailListSearch from '@/components/admin/EmailListSearch'
import ExportEmailListButton from '@/components/admin/ExportEmailListButton'
import DeleteSubscriberButton from '@/components/admin/DeleteSubscriberButton'

export const metadata: Metadata = {
  title: 'Email List',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 20

type SearchParams = Promise<{ q?: string; source?: string; page?: string }>

type SubscriberRow = {
  id: string
  email: string
  first_name: string | null
  subscribed_at: string
  source?: string | null
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function loadEmailList(sp: Awaited<SearchParams>) {
  const supabase = await createClient()

  const q      = (sp.q ?? '').trim()
  const source = (sp.source ?? 'all').toLowerCase()
  const page   = Math.max(1, Number(sp.page ?? '1') || 1)
  const from   = (page - 1) * PAGE_SIZE
  const to     = from + PAGE_SIZE - 1
  const safeQ  = q.replace(/[%,]/g, '')

  // Probe for `source` column (v3 schema). If missing, list still works
  // without source-based filtering / display.
  let sourceColumnExists = true
  let baseSelect = 'id, email, first_name, subscribed_at, source'

  const probeQuery = supabase
    .from('email_subscribers').select(baseSelect, { count: 'exact' })
    .order('subscribed_at', { ascending: false })

  let query = probeQuery
  if (safeQ)               query = query.or(`email.ilike.%${safeQ}%,first_name.ilike.%${safeQ}%`)
  if (source !== 'all')    query = query.eq('source', source)

  let { data, count, error } = await query.range(from, to)

  if (error && /source/i.test(error.message)) {
    sourceColumnExists = false
    baseSelect = 'id, email, first_name, subscribed_at'
    let q2 = supabase
      .from('email_subscribers').select(baseSelect, { count: 'exact' })
      .order('subscribed_at', { ascending: false })
    if (safeQ) q2 = q2.or(`email.ilike.%${safeQ}%,first_name.ilike.%${safeQ}%`)
    const fallback = await q2.range(from, to)
    data  = fallback.data as typeof data
    count = fallback.count
    error = fallback.error
  }

  // Distinct sources for the filter dropdown — only when the column exists.
  let sources: string[] = []
  if (sourceColumnExists) {
    const { data: rows } = await supabase
      .from('email_subscribers').select('source')
      .not('source', 'is', null)
    sources = Array.from(new Set((rows ?? []).map((r: { source: string | null }) => r.source).filter(Boolean) as string[])).sort()
  }

  return {
    subscribers: (data ?? []) as unknown as SubscriberRow[],
    total: count ?? 0,
    page,
    filters: { q, source },
    sourceColumnExists,
    sources,
  }
}

async function loadInsights() {
  const supabase = await createClient()

  const now       = new Date()
  const thisMonth = currentMonthRange(now)
  const lastMonth = previousMonthRange(now)
  const eightWksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000)

  const [totalQ, thisMonthQ, lastMonthQ, last8WeeksQ] = await Promise.all([
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true })
      .gte('subscribed_at', thisMonth.start.toISOString()).lt('subscribed_at', thisMonth.end.toISOString()),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true })
      .gte('subscribed_at', lastMonth.start.toISOString()).lt('subscribed_at', lastMonth.end.toISOString()),
    supabase.from('email_subscribers').select('subscribed_at')
      .gte('subscribed_at', eightWksAgo.toISOString()),
  ])

  // Bucket the last 8 weeks of signups
  const buckets = new Array(8).fill(0) as number[]
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const startMs = eightWksAgo.getTime()
  for (const r of (last8WeeksQ.data ?? []) as { subscribed_at: string }[]) {
    const t = new Date(r.subscribed_at).getTime()
    const idx = Math.min(7, Math.max(0, Math.floor((t - startMs) / msPerWeek)))
    buckets[idx]++
  }

  return {
    total: totalQ.count ?? 0,
    thisMonth: thisMonthQ.count ?? 0,
    lastMonth: lastMonthQ.count ?? 0,
    weeklyBuckets: buckets,
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SourcePill({ source }: { source: string | null | undefined }) {
  if (!source) {
    return <span style={{ color: 'var(--admin-on-surface-variant)' }}>—</span>
  }
  // Stable palette per source name
  const palettes = [
    { bg: 'var(--admin-sage-container)', fg: 'var(--admin-on-sage-container)' },
    { bg: 'var(--admin-rose-fixed)',     fg: 'var(--admin-on-rose-fixed)' },
    { bg: 'var(--admin-celadon-pale)',   fg: 'var(--admin-primary-container)' },
    { bg: 'var(--admin-sand-fixed)',     fg: 'var(--admin-on-sand-fixed)' },
  ]
  let hash = 0
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  const palette = palettes[hash % palettes.length]
  return (
    <span
      className="inline-flex px-3 py-1 rounded-full"
      style={{
        background: palette.bg,
        color: palette.fg,
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'capitalize',
      }}
    >
      {source.replace(/[-_]/g, ' ')}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminEmailListPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const empty = {
    subscribers: [] as SubscriberRow[],
    total: 0, page: 1,
    filters: { q: sp.q ?? '', source: sp.source ?? 'all' },
    sourceColumnExists: false,
    sources: [] as string[],
  }
  const emptyInsights = { total: 0, thisMonth: 0, lastMonth: 0, weeklyBuckets: new Array(8).fill(0) as number[] }

  const [data, insights] = supabaseConfigured
    ? await Promise.all([loadEmailList(sp), loadInsights()])
    : [empty, emptyInsights]

  const { subscribers, total, page, filters, sourceColumnExists, sources } = data

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (filters.q)                  params.set('q', filters.q)
    if (filters.source !== 'all')   params.set('source', filters.source)
    if (p > 1)                      params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/email-list?${qs}` : '/admin/email-list'
  }

  const trendText = formatTrendPercent(insights.thisMonth, insights.lastMonth)
  const maxBucket = Math.max(1, ...insights.weeklyBuckets)

  return (
    <div className="space-y-6">

      {/* Export action — right-aligned */}
      <div className="flex justify-end">
        <ExportEmailListButton />
      </div>

      {/* Total community members card */}
      <div
        className="admin-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <p className="uppercase" style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--admin-on-surface-variant)',
          }}>
            Total Community Members
          </p>
          <h3 className="mt-1" style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '2.5rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
            lineHeight: 1.05,
          }}>
            {formatCompact(insights.total)}
          </h3>
          <div className="mt-2 flex items-center gap-1.5"
               style={{
                 fontFamily: 'var(--font-hanken)',
                 fontSize: '0.8125rem',
                 fontWeight: 600,
                 color: 'var(--admin-sage)',
               }}>
            <TrendingUp size={14} />
            <span>
              {insights.lastMonth === 0 && insights.thisMonth === 0
                ? 'No new signups yet'
                : insights.lastMonth === 0
                  ? `+${insights.thisMonth} this month`
                  : `${trendText} from last month`}
            </span>
          </div>
        </div>

        {/* Mini bar chart — last 8 weeks */}
        <div
          className="flex items-end gap-1.5"
          style={{ height: '64px' }}
          aria-label="Weekly signups (last 8 weeks)"
          title="Weekly signups (last 8 weeks)"
        >
          {insights.weeklyBuckets.map((count, i) => {
            const pct = (count / maxBucket) * 100
            const isLast = i === insights.weeklyBuckets.length - 1
            return (
              <div
                key={i}
                style={{
                  width: '20px',
                  height: `${Math.max(8, pct)}%`,
                  background: isLast ? 'var(--admin-primary-container)' : 'var(--admin-celadon)',
                  borderRadius: '3px',
                  transition: 'height 0.3s',
                  opacity: count === 0 ? 0.25 : 1,
                }}
                title={`Week ${i + 1}: ${count}`}
              />
            )
          })}
        </div>
      </div>

      {/* Search + source filter */}
      <EmailListSearch sources={sources} />

      {/* Table card */}
      <div className="admin-card overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Email Address</th>
                <th>Date Subscribed</th>
                <th>Source</th>
                <th className="text-right" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <p style={{
                      fontFamily: 'var(--font-eb-garamond)',
                      fontSize: '1.125rem',
                      color: 'var(--admin-on-surface-variant)',
                    }}>
                      {filters.q || filters.source !== 'all'
                        ? 'No subscribers match those filters.'
                        : 'No subscribers yet — they’ll appear here when people sign up.'}
                    </p>
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 600, color: 'var(--admin-on-surface)' }}>
                      {sub.first_name?.trim() || <span style={{ color: 'var(--admin-on-surface-variant)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--admin-on-surface-variant)' }}>{sub.email}</td>
                    <td style={{ color: 'var(--admin-on-surface-variant)' }}>
                      {formatShortDate(sub.subscribed_at)}
                    </td>
                    <td>
                      {sourceColumnExists
                        ? <SourcePill source={sub.source ?? 'website'} />
                        : <span style={{ color: 'var(--admin-on-surface-variant)' }}>—</span>}
                    </td>
                    <td className="text-right">
                      <DeleteSubscriberButton id={sub.id} email={sub.email} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: 'var(--admin-surface-low)' }}
          >
            <p style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              color: 'var(--admin-on-surface-variant)',
            }}>
              Showing {formatNumber(start)} to {formatNumber(end)} of {formatNumber(total)} subscribers
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
              <span
                className="px-4 inline-flex items-center"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--admin-on-surface)',
                }}
              >
                Page {page} of {totalPages}
              </span>
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
        )}
      </div>

      {!sourceColumnExists && (
        <p
          className="italic"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
            margin: 0,
          }}
        >
          Run <code>supabase-schema-v3.sql</code> to enable per-source tracking
          (adds <code>email_subscribers.source</code>).
        </p>
      )}
    </div>
  )
}
