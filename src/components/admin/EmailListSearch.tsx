'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Search } from 'lucide-react'

export default function EmailListSearch({
  sources,
}: {
  sources: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const initialQ = searchParams?.get('q') ?? ''
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(searchParams?.get('q') ?? '')
  }, [searchParams])

  function pushParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') params.delete(k)
      else params.set(k, v)
    }
    params.delete('page')
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `/admin/email-list?${qs}` : '/admin/email-list')
    })
  }

  useEffect(() => {
    if (q === initialQ) return
    const t = setTimeout(() => pushParams({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const source = searchParams?.get('source') ?? 'all'

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
          placeholder="Search by name or email..."
          aria-label="Search subscribers"
          style={{ paddingLeft: '2.5rem', background: 'var(--admin-surface)' }}
        />
      </div>

      {sources.length > 0 && (
        <div className="flex items-center gap-2">
          <label
            className="uppercase"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            Source
          </label>
          <select
            aria-label="Filter by source"
            value={source}
            onChange={(e) => pushParams({ source: e.target.value })}
            style={{
              background: 'var(--admin-surface)',
              padding: '0.5rem 2rem 0.5rem 0.75rem',
              fontSize: '0.8125rem',
              minWidth: '160px',
            }}
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
