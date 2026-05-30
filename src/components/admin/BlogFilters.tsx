'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'

type StatusValue = 'all' | 'published' | 'draft'

const STATUS_OPTIONS: { label: string; value: StatusValue }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Drafts',    value: 'draft' },
]

export default function BlogFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const initialQ = searchParams?.get('q') ?? ''
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    // Keep the search input aligned with browser back/forward and filter links.
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
      router.replace(qs ? `/admin/blog?${qs}` : '/admin/blog')
    })
  }

  // Debounced search
  useEffect(() => {
    if (q === initialQ) return
    const t = setTimeout(() => pushParams({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const status = (searchParams?.get('status') ?? 'all') as StatusValue

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
          placeholder="Search blog posts..."
          aria-label="Search blog posts"
          style={{ paddingLeft: '2.5rem', background: 'var(--admin-surface)' }}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Segmented status filter */}
        <div
          role="radiogroup"
          aria-label="Status filter"
          className="flex rounded-lg p-1"
          style={{ background: 'var(--admin-surface-container)' }}
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pushParams({ status: opt.value })}
                className="px-4 py-1.5 rounded-md transition-all"
                style={{
                  background: active ? 'var(--admin-surface)' : 'transparent',
                  color: active ? 'var(--admin-primary-container)' : 'var(--admin-on-surface-variant)',
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.8125rem',
                  fontWeight: active ? 700 : 600,
                  letterSpacing: '0.03em',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px rgba(21,51,40,0.06)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <Link href="/admin/blog/new" className="admin-btn-primary whitespace-nowrap">
          <Plus size={16} strokeWidth={2.5} />
          Create New Post
        </Link>
      </div>
    </div>
  )
}
