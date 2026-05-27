'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Search } from 'lucide-react'

type StatusValue = 'all' | 'published' | 'draft'
type TypeValue   = 'all' | 'paid'      | 'free'

/**
 * Client-side controls that update the URL query string. The server component
 * re-renders with the new filters via Next's streaming.
 */
export default function CourseFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const initialQ = searchParams?.get('q') ?? ''
  const [q, setQ] = useState(initialQ)

  // Keep local input in sync if the URL changes externally.
  useEffect(() => {
    setQ(searchParams?.get('q') ?? '')
  }, [searchParams])

  function pushParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') params.delete(k)
      else params.set(k, v)
    }
    // Reset to page 1 whenever a filter changes
    params.delete('page')
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `/admin/courses?${qs}` : '/admin/courses')
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
  const type   = (searchParams?.get('type')   ?? 'all') as TypeValue

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
          placeholder="Search courses..."
          aria-label="Search courses"
          style={{
            paddingLeft: '2.5rem',
            background: 'var(--admin-surface)',
          }}
        />
      </div>

      {/* Filters + CTA */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center rounded-lg p-1"
          style={{ background: 'var(--admin-surface-container)' }}
        >
          <FilterSelect
            ariaLabel="Status filter"
            value={status}
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Published', value: 'published' },
              { label: 'Draft / Archived', value: 'draft' },
            ]}
            onChange={(v) => pushParams({ status: v })}
          />
          <div className="w-px h-4" style={{ background: 'rgba(193, 200, 195, 0.4)' }} />
          <FilterSelect
            ariaLabel="Type filter"
            value={type}
            options={[
              { label: 'All Types', value: 'all' },
              { label: 'Free',      value: 'free' },
              { label: 'Paid',      value: 'paid' },
            ]}
            onChange={(v) => pushParams({ type: v })}
          />
        </div>

        <a href="/admin/courses/new" className="admin-btn-primary whitespace-nowrap">
          <span style={{ fontSize: '1.125rem', lineHeight: 1, marginRight: '0.125rem' }}>+</span>
          Create New Course
        </a>
      </div>

      {pending && (
        <span
          className="sr-only"
          aria-live="polite"
        >
          Updating results
        </span>
      )}
    </div>
  )
}

function FilterSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
  ariaLabel: string
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'transparent',
        border: 'none',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: 'var(--admin-on-surface-variant)',
        padding: '0.375rem 1.5rem 0.375rem 0.75rem',
        cursor: 'pointer',
        width: 'auto',
        boxShadow: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
