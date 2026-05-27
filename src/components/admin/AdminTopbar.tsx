'use client'

import { usePathname } from 'next/navigation'
import { Bell, HelpCircle } from 'lucide-react'

/** Maps the first segment after /admin/ to a human page title. */
const SEGMENT_TITLES: Record<string, string> = {
  '':            'Dashboard Overview',
  'courses':     'Course Manager',
  'blog':        'Blog Manager',
  'students':    'Student Manager',
  'email-list':  'Email List',
  'orders':      'Orders',
  'shop':        'Shop Manager',
  'settings':    'Settings',
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Admin'
  const trimmed = pathname.replace(/^\/admin\/?/, '').replace(/\/.*$/, '')
  return SEGMENT_TITLES[trimmed] ?? 'Admin'
}

export default function AdminTopbar({
  adminName,
  adminEmail,
}: {
  adminName: string
  adminEmail: string
}) {
  const pathname = usePathname()
  const initials = adminName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="admin-topbar">
      <h2>{getPageTitle(pathname)}</h2>

      <div className="flex items-center gap-6">
        <button
          aria-label="Notifications"
          className="transition-colors"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--admin-primary-container)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--admin-on-surface-variant)')}
        >
          <Bell size={20} />
        </button>
        <button
          aria-label="Help"
          className="transition-colors"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--admin-primary-container)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--admin-on-surface-variant)')}
        >
          <HelpCircle size={20} />
        </button>

        <div
          className="flex items-center gap-3 pl-4 border-l"
          style={{ borderColor: 'var(--admin-outline-variant)' }}
        >
          <div className="text-right leading-tight">
            <p
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--admin-on-surface)',
                margin: 0,
              }}
            >
              {adminName}
            </p>
            <p
              className="uppercase"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.625rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--admin-on-surface-variant)',
                margin: 0,
              }}
            >
              {adminEmail}
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--admin-sage-fixed)',
              color: 'var(--admin-on-sage-container)',
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            {initials || 'A'}
          </div>
        </div>
      </div>
    </header>
  )
}
