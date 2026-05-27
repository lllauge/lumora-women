import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, BookOpen, Settings, LogOut } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Account Settings | Lumora Women',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/dashboard/settings')

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--warm-white)' }}>

      {/* Sidebar */}
      <aside
        style={{
          width: '240px', flexShrink: 0,
          background: 'var(--sage-green-dark)',
          display: 'flex', flexDirection: 'column',
          padding: '2rem 0',
          position: 'sticky', top: 0, height: '100vh',
        }}
      >
        <Link href="/" style={{ display: 'block', padding: '0 1.5rem', marginBottom: '2.5rem', textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#FFFFFF' }}>
            Lumora Women
          </span>
        </Link>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
          <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
          <NavItem href="/courses" icon={<BookOpen className="w-4 h-4" />} label="Browse Courses" />
          <NavItem href="/dashboard/settings" icon={<Settings className="w-4 h-4" />} label="Settings" active />
        </nav>

        <div style={{ padding: '0 0.75rem', marginTop: 'auto' }}>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign Out
            </button>
          </form>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: '0.75rem', padding: '1rem 0.875rem 0' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.125rem' }}>
              {profile?.first_name} {profile?.last_name}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {profile?.email ?? user.email}
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main id="main-content" style={{ flex: 1, padding: "3rem 2.5rem", maxWidth: "640px" }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--deep-earth)', marginBottom: '0.375rem' }}>
          Account Settings
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--on-surface-variant)', marginBottom: '2.5rem' }}>
          Manage your profile and account preferences.
        </p>

        {/* Profile card */}
        <div
          style={{
            background: '#FFFFFF', borderRadius: '1rem',
            border: '1px solid var(--outline-variant)',
            padding: '1.75rem', marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--deep-earth)', marginBottom: '1.5rem' }}>
            Profile
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="First Name" value={profile?.first_name ?? ''} />
            <Field label="Last Name" value={profile?.last_name ?? ''} />
          </div>
          <Field label="Email Address" value={profile?.email ?? user.email ?? ''} />

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '1.25rem' }}>
            To update your name or email, contact us at{' '}
            <a href="mailto:hello@lumorawomen.com" style={{ color: 'var(--warm-terracotta)' }}>
              hello@lumorawomen.com
            </a>
          </p>
        </div>

        {/* Password card */}
        <div
          style={{
            background: '#FFFFFF', borderRadius: '1rem',
            border: '1px solid var(--outline-variant)',
            padding: '1.75rem',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--deep-earth)', marginBottom: '0.75rem' }}>
            Password
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>
            Send yourself a password reset link via email.
          </p>
          <Link
            href="/forgot-password"
            className="btn-secondary"
            style={{ borderRadius: '0.5rem', padding: '0.75rem 1.5rem', display: 'inline-block' }}
          >
            Reset Password
          </Link>
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
        textDecoration: 'none', minHeight: '44px',
        background: active ? 'rgba(255,255,255,0.12)' : 'none',
        color: active ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
        fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
      }}
    >
      {icon}
      {label}
    </Link>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--deep-earth)', display: 'block', marginBottom: '0.375rem' }}>
        {label}
      </p>
      <div
        style={{
          padding: '0.75rem 1rem', borderRadius: '0.5rem',
          border: '1.5px solid var(--outline-variant)',
          background: 'var(--surface-container-low)',
          fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
          color: 'var(--on-surface-variant)',
        }}
      >
        {value || '—'}
      </div>
    </div>
  )
}
