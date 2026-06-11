'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, CalendarDays, TrendingUp, MessageCircle } from 'lucide-react'

const TABS = [
  { href: '/coaching/today', label: 'Today', Icon: Sun },
  { href: '/coaching/plan', label: 'My Plan', Icon: CalendarDays },
  { href: '/coaching/progress', label: 'Progress', Icon: TrendingUp },
  { href: '/coaching/coach', label: 'Coach', Icon: MessageCircle },
]

export function PortalSidebarNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Coaching sections" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
              textDecoration: 'none',
              background: active ? 'rgba(255,255,255,0.1)' : 'none',
              color: active ? '#FFFFFF' : 'rgba(200,220,192,0.75)',
              borderLeft: active ? '2px solid var(--gold-dark)' : '2px solid transparent',
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
              minHeight: '44px',
            }}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function PortalTabBar() {
  const pathname = usePathname()
  return (
    <nav className="portal-tabbar" aria-label="Coaching sections">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={pathname?.startsWith(href) ? 'page' : undefined}>
          <Icon style={{ width: '1.125rem', height: '1.125rem' }} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
