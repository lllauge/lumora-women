/**
 * Shared formatters used across admin (and possibly public) pages.
 */

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const CURRENCY_PRECISE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatCurrency(amount: number | string | null | undefined, opts?: { precise?: boolean }): string {
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (n == null || Number.isNaN(n)) return '—'
  return opts?.precise ? CURRENCY_PRECISE.format(n) : CURRENCY.format(n)
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US').format(n)
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return COMPACT.format(n)
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return SHORT_DATE.format(d)
}

/** "14 minutes ago", "2 hours ago", "Yesterday", "Oct 11, 2023" */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.round(diffMs / 1000)
  const min = Math.round(sec / 60)
  const hr  = Math.round(min / 60)
  const day = Math.round(hr / 24)

  if (sec < 45) return 'Just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  if (hr  < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  if (day === 1) return 'Yesterday'
  if (day < 7)  return `${day} days ago`
  return formatShortDate(iso)
}

export function getInitials(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase() || fallback
}

/** Picks a stable avatar palette key from a stable string (user id or email). */
export function avatarPaletteIndex(seed: string | null | undefined): number {
  if (!seed) return 0
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % 4
}

export function currentMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export function previousMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start, end }
}

/** Returns "+12.4%", "−3%", or "—" for trend pills. */
export function formatTrendPercent(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? 'New' : '—'
  const pct = ((current - previous) / previous) * 100
  if (!Number.isFinite(pct)) return '—'
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return `${sign}${Math.abs(pct).toFixed(pct >= 10 || pct <= -10 ? 0 : 1)}%`
}
