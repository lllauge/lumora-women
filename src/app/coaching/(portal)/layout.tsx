import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PortalSidebarNav, PortalTabBar } from '@/components/coaching/PortalNav'

export default function CoachingPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">

      {/* Mobile top bar */}
      <header className="portal-mobile-header">
        <Link
          href="/"
          aria-label="Lumora Women — home"
          className="gold-text"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, textDecoration: 'none' }}
        >
          Lumora Women
        </Link>
        <Link
          href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
            color: 'rgba(200,220,192,0.85)', textDecoration: 'none',
          }}
        >
          <ArrowLeft style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true" />
          Dashboard
        </Link>
      </header>

      {/* Desktop sidebar */}
      <aside className="portal-sidebar" aria-label="Coaching navigation">
        <Link
          href="/"
          aria-label="Lumora Women — home"
          style={{ display: 'block', padding: '0 1.5rem', marginBottom: '2.5rem', textDecoration: 'none' }}
        >
          <span
            className="gold-text"
            aria-hidden="true"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700 }}
          >
            Lumora Women
          </span>
        </Link>

        <PortalSidebarNav />

        <div style={{ padding: '0 0.75rem', marginTop: 'auto' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
              textDecoration: 'none', minHeight: '44px',
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
              color: 'rgba(200,220,192,0.75)',
            }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      <main id="main-content" className="portal-main">
        {children}
      </main>

      {/* Mobile bottom tabs */}
      <PortalTabBar />
    </div>
  )
}
