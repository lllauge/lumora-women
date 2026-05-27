'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { CalendarDays, Download, Loader2, Search } from 'lucide-react'
import { exportOrdersCSV } from '@/app/actions/admin-orders'

const RANGES = [
  { value: '7d',  label: 'Last 7 days'  },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time'     },
]

export default function OrdersToolbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startNav] = useTransition()
  const [exporting, startExport] = useTransition()

  const initialQ = searchParams?.get('q') ?? ''
  const [q, setQ] = useState(initialQ)

  useEffect(() => { setQ(searchParams?.get('q') ?? '') }, [searchParams])

  function pushParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all-clear') params.delete(k)
      else params.set(k, v)
    }
    params.delete('page')
    const qs = params.toString()
    startNav(() => {
      router.replace(qs ? `/admin/orders?${qs}` : '/admin/orders')
    })
  }

  useEffect(() => {
    if (q === initialQ) return
    const t = setTimeout(() => pushParams({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const range = searchParams?.get('range') ?? '30d'

  function handleExport() {
    startExport(async () => {
      const result = await exportOrdersCSV({
        q: searchParams?.get('q') ?? '',
        range,
      })
      if (!result.ok) {
        window.alert(`Could not export: ${result.error}`)
        return
      }
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Search */}
      <div className="relative w-full lg:max-w-md">
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--admin-outline-variant)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by Stripe payment ID…"
          aria-label="Search orders"
          style={{ paddingLeft: '2.5rem', background: 'var(--admin-surface)' }}
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Date range */}
        <div className="relative">
          <CalendarDays
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--admin-on-surface-variant)',
              pointerEvents: 'none',
            }}
          />
          <select
            aria-label="Date range"
            value={range}
            onChange={(e) => pushParams({ range: e.target.value === '30d' ? null : e.target.value })}
            style={{
              background: 'var(--admin-surface)',
              padding: '0.5rem 2rem 0.5rem 2.25rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              minWidth: '170px',
            }}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="admin-btn-primary"
          style={{ cursor: exporting ? 'wait' : 'pointer' }}
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          <span>{exporting ? 'Preparing…' : 'Export Data'}</span>
        </button>
      </div>
    </div>
  )
}
