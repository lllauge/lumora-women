'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Search } from 'lucide-react'

export default function StudentSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const initialQ = searchParams?.get('q') ?? ''
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(searchParams?.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    if (q === initialQ) return
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      if (q.trim()) params.set('q', q.trim())
      else params.delete('q')
      params.delete('page')
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `/admin/students?${qs}` : '/admin/students')
      })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="relative w-full lg:max-w-lg">
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
        placeholder="Search students by name or email..."
        aria-label="Search students"
        style={{ paddingLeft: '2.5rem', background: 'var(--admin-surface)' }}
      />
    </div>
  )
}
