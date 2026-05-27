import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  avatarPaletteIndex,
  currentMonthRange,
  formatCurrency,
  formatNumber,
  formatShortDate,
  formatTrendPercent,
  getInitials,
  previousMonthRange,
} from '@/utils/format'
import { rangeBounds } from '@/lib/orders-range'
import OrdersToolbar from '@/components/admin/OrdersToolbar'
import OrderDrawer from '@/components/admin/OrderDrawer'

export const metadata: Metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 20

type SearchParams = Promise<{ q?: string; range?: string; page?: string }>

type OrderRow = {
  id: string
  amount: number | string
  status: string
  stripe_payment_id: string | null
  created_at: string
  users:   { id: string; email: string; first_name: string | null; last_name: string | null } | null
  courses: { title: string | null } | null
}

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--admin-sage-fixed)',   fg: 'var(--admin-on-sage-container)' },
  { bg: 'var(--admin-rose-fixed)',   fg: 'var(--admin-on-rose-fixed)' },
  { bg: 'var(--admin-celadon-pale)', fg: 'var(--admin-primary-container)' },
  { bg: 'var(--admin-sand-fixed)',   fg: 'var(--admin-on-sand-fixed)' },
]

// ─── Data ─────────────────────────────────────────────────────────────────────

async function loadOrders(sp: Awaited<SearchParams>) {
  const supabase = await createClient()

  const q       = (sp.q ?? '').trim()
  const range   = (sp.range ?? '30d').toLowerCase()
  const page    = Math.max(1, Number(sp.page ?? '1') || 1)
  const from    = (page - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1
  const safeQ   = q.replace(/[%,]/g, '')

  const { from: rangeFrom, label: rangeLabel } = rangeBounds(range)

  let query = supabase
    .from('orders')
    .select(`
      id, amount, status, stripe_payment_id, created_at,
      users(id, email, first_name, last_name),
      courses(title)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (rangeFrom) query = query.gte('created_at', rangeFrom)
  if (safeQ)     query = query.or(`stripe_payment_id.ilike.%${safeQ}%`)

  const { data, count } = await query.range(from, to)

  return {
    orders: (data ?? []) as unknown as OrderRow[],
    total: count ?? 0,
    page,
    filters: { q, range, rangeLabel },
  }
}

async function loadOrdersInsights(rangeFrom: string) {
  const supabase = await createClient()

  const now       = new Date()
  const thisMonth = currentMonthRange(now)
  const lastMonth = previousMonthRange(now)

  const [
    allPaidQ,
    paidThisMonthQ,
    paidLastMonthQ,
    paidInRangeQ,
  ] = await Promise.all([
    supabase.from('orders').select('amount').eq('status', 'paid'),
    supabase.from('orders').select('amount').eq('status', 'paid')
      .gte('created_at', thisMonth.start.toISOString())
      .lt('created_at',  thisMonth.end.toISOString()),
    supabase.from('orders').select('amount').eq('status', 'paid')
      .gte('created_at', lastMonth.start.toISOString())
      .lt('created_at',  lastMonth.end.toISOString()),
    rangeFrom
      ? supabase.from('orders').select('amount').eq('status', 'paid').gte('created_at', rangeFrom)
      : supabase.from('orders').select('amount').eq('status', 'paid'),
  ])

  const sum = (rows: { amount: number | string }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.amount ?? 0), 0)

  const totalRevenue     = sum(allPaidQ.data)
  const revThisMonth     = sum(paidThisMonthQ.data)
  const revLastMonth     = sum(paidLastMonthQ.data)
  const ordersThisMonth  = (paidThisMonthQ.data ?? []).length
  const ordersLastMonth  = (paidLastMonthQ.data ?? []).length

  const paidInRangeRows = paidInRangeQ.data ?? []
  const aovRange = paidInRangeRows.length > 0
    ? sum(paidInRangeRows) / paidInRangeRows.length
    : 0
  const aovPrior = ordersLastMonth > 0 ? revLastMonth / ordersLastMonth : 0

  return {
    totalRevenue,
    revThisMonth,
    revLastMonth,
    ordersThisMonth,
    ordersLastMonth,
    aov: aovRange,
    aovTrend: aovPrior > 0 ? ((aovRange - aovPrior) / aovPrior) * 100 : null,
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const klass =
    status === 'paid'     ? 'admin-pill-success' :
    status === 'pending'  ? 'admin-pill-warning' :
    status === 'refunded' ? 'admin-pill-neutral' :
                            'admin-pill-error'
  return <span className={`admin-pill ${klass}`}>{status}</span>
}

function StudentCell({ row }: { row: OrderRow }) {
  const fullName =
    [row.users?.first_name, row.users?.last_name].filter(Boolean).join(' ').trim() ||
    row.users?.email ||
    'Unknown'
  const initials = getInitials(fullName)
  const palette = AVATAR_PALETTE[avatarPaletteIndex(row.users?.id ?? row.id)]

  return (
    <div className="flex items-center gap-3">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: palette.bg,
          color: palette.fg,
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.625rem',
          fontWeight: 700,
        }}
      >
        {initials}
      </span>
      <span style={{
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'var(--admin-on-surface)',
      }}>
        {fullName}
      </span>
    </div>
  )
}

/** Synthetic short order number derived from the UUID. */
function shortOrderNumber(id: string): string {
  return '#LMR-' + id.replace(/-/g, '').slice(0, 4).toUpperCase()
}

function StatCard({
  label, value, trend, icon: Icon, tone = 'light',
}: {
  label: string
  value: string
  trend?: string
  icon: React.ComponentType<{ size?: number }>
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <div
      className="p-6 rounded-xl flex flex-col justify-between"
      style={{
        background: dark ? 'var(--admin-primary-container)' : 'var(--admin-surface)',
        color: dark ? 'var(--admin-bg)' : 'var(--admin-on-surface)',
        border: dark ? 'none' : '1px solid var(--admin-outline-variant)',
        boxShadow: '0 12px 24px -10px rgba(21, 51, 40, 0.05)',
        minHeight: '120px',
      }}
    >
      <div className="flex justify-between items-start">
        <p
          className="uppercase"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: dark ? 'rgba(245, 244, 239, 0.7)' : 'var(--admin-on-surface-variant)',
          }}
        >
          {label}
        </p>
        <Icon size={18} />
      </div>
      <div className="flex items-end justify-between gap-3 mt-3">
        <h3 style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '2rem',
          fontWeight: 500,
          color: dark ? 'var(--admin-bg)' : 'var(--admin-on-surface)',
          lineHeight: 1.1,
          margin: 0,
        }}>
          {value}
        </h3>
        {trend && (
          <span
            className="flex items-center gap-1"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: dark ? 'var(--admin-celadon)' : 'var(--admin-sage)',
            }}
          >
            <TrendingUp size={12} />
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const emptyOrders = {
    orders: [] as OrderRow[],
    total: 0, page: 1,
    filters: { q: sp.q ?? '', range: sp.range ?? '30d', rangeLabel: 'Last 30 days' },
  }
  const emptyInsights = {
    totalRevenue: 0, revThisMonth: 0, revLastMonth: 0,
    ordersThisMonth: 0, ordersLastMonth: 0, aov: 0, aovTrend: null as number | null,
  }

  const rangeFromIso = rangeBounds(sp.range ?? '30d').from

  const [data, insights] = supabaseConfigured
    ? await Promise.all([loadOrders(sp), loadOrdersInsights(rangeFromIso)])
    : [emptyOrders, emptyInsights]

  const { orders, total, page, filters } = data
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (filters.q)             params.set('q', filters.q)
    if (filters.range !== '30d') params.set('range', filters.range)
    if (p > 1)                 params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/orders?${qs}` : '/admin/orders'
  }

  const revTrend = formatTrendPercent(insights.revThisMonth, insights.revLastMonth)
  const orderTrend = formatTrendPercent(insights.ordersThisMonth, insights.ordersLastMonth)
  const aovTrend = insights.aovTrend == null
    ? undefined
    : `${insights.aovTrend >= 0 ? '+' : ''}${insights.aovTrend.toFixed(1)}%`

  return (
    <div className="space-y-6">

      {/* Stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(insights.totalRevenue, { precise: true })}
          trend={insights.revLastMonth > 0 || insights.revThisMonth > 0 ? revTrend : undefined}
          icon={Wallet}
        />
        <StatCard
          label="Orders This Month"
          value={formatNumber(insights.ordersThisMonth)}
          trend={insights.ordersLastMonth > 0 || insights.ordersThisMonth > 0 ? orderTrend : undefined}
          icon={Receipt}
        />
        <StatCard
          label="Avg Order Value"
          value={formatCurrency(insights.aov, { precise: true })}
          trend={aovTrend}
          icon={TrendingUp}
        />
      </div>

      {/* Toolbar */}
      <OrdersToolbar />

      {/* Table */}
      <div className="admin-card overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Student</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right" style={{ width: '80px' }}>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <p style={{
                      fontFamily: 'var(--font-eb-garamond)',
                      fontSize: '1.125rem',
                      color: 'var(--admin-on-surface-variant)',
                    }}>
                      {filters.q
                        ? 'No orders match this search.'
                        : `No orders in this range (${filters.rangeLabel.toLowerCase()}).`}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <OrderDrawer
                        orderId={order.id}
                        initialStatus={order.status}
                        trigger={
                          <button
                            type="button"
                            className="text-left"
                            style={{
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: 'var(--admin-primary-container)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {shortOrderNumber(order.id)}
                          </button>
                        }
                      />
                    </td>
                    <td><StudentCell row={order} /></td>
                    <td style={{ color: 'var(--admin-on-surface)' }}>
                      {order.courses?.title ?? <span style={{ color: 'var(--admin-on-surface-variant)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--admin-primary-container)' }}>
                      {formatCurrency(order.amount, { precise: true })}
                    </td>
                    <td><StatusPill status={order.status} /></td>
                    <td style={{ color: 'var(--admin-on-surface-variant)' }}>
                      {formatShortDate(order.created_at)}
                    </td>
                    <td className="text-right">
                      <OrderDrawer
                        orderId={order.id}
                        initialStatus={order.status}
                        trigger={
                          <button
                            type="button"
                            aria-label="View order details"
                            className="px-3 py-1.5 rounded transition-colors"
                            style={{
                              fontFamily: 'var(--font-hanken)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              color: 'var(--admin-primary-container)',
                              background: 'transparent',
                              border: '1px solid var(--admin-outline-variant)',
                              cursor: 'pointer',
                            }}
                          >
                            View
                          </button>
                        }
                      />
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
              Showing {formatNumber(start)} to {formatNumber(end)} of {formatNumber(total)} orders
              <span style={{ opacity: 0.6 }}> · {filters.rangeLabel}</span>
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
    </div>
  )
}
