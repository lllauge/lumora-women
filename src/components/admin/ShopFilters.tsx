'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Search } from 'lucide-react'

export default function ShopFilters({ categories }: { categories: string[] }) {
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
      router.replace(qs ? `/admin/shop?${qs}` : '/admin/shop')
    })
  }

  useEffect(() => {
    if (q === initialQ) return
    const t = setTimeout(() => pushParams({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const category = searchParams?.get('category') ?? 'all'

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Category pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <CategoryPill label="All Items" value="all" active={category === 'all'} onClick={(v) => pushParams({ category: v })} />
        {categories.map((c) => (
          <CategoryPill
            key={c}
            label={c}
            value={c}
            active={category === c}
            onClick={(v) => pushParams({ category: v })}
          />
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full lg:max-w-xs">
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '0.75rem',
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
          placeholder="Search products..."
          aria-label="Search products"
          style={{ paddingLeft: '2.25rem', background: 'var(--admin-surface)' }}
        />
      </div>
    </div>
  )
}

function CategoryPill({
  label, value, active, onClick,
}: {
  label: string
  value: string
  active: boolean
  onClick: (v: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className="px-4 py-1.5 rounded-full transition-colors"
      style={{
        background: active ? 'var(--admin-primary-container)' : 'transparent',
        color:      active ? 'var(--admin-bg)' : 'var(--admin-on-surface-variant)',
        border:     `1px solid ${active ? 'var(--admin-primary-container)' : 'var(--admin-outline-variant)'}`,
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        textTransform: 'capitalize',
      }}
    >
      {label.replace(/[-_]/g, ' ')}
    </button>
  )
}
