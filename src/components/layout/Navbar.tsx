'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const baseNavLinks = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/courses' },
  { label: 'Blog', href: '/blog' },
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },
]

export default function Navbar({ showShop = false }: { showShop?: boolean }) {
  const navLinks = showShop ? baseNavLinks : baseNavLinks.filter((l) => l.href !== '/shop')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const pathname = usePathname()
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  useEffect(() => {
    if (!isConfigured) return
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [isConfigured])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, closeMobileMenu])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  return (
    <header
      className="sticky top-0 w-full z-50 glass-nav transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(22, 40, 20, 0.97)' : 'rgba(22, 40, 20, 0.92)',
        boxShadow: scrolled ? '0 4px 20px -8px rgba(22,40,20,0.4)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16">
        <div
          className="flex items-center justify-between transition-all duration-300"
          style={{ paddingTop: scrolled ? '0.5rem' : '1rem', paddingBottom: scrolled ? '0.5rem' : '1rem' }}
        >
          {/* Logo */}
          <Link href="/" className="shrink-0" aria-label="Lumora Women — home">
            <span
              className="text-2xl tracking-tight gold-text"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
              aria-hidden="true"
            >
              Lumora
            </span>
          </Link>

          {/* Desktop nav links — center */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className="text-sm transition-all duration-150"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--botanical-light)' : 'rgba(200, 220, 192, 0.75)',
                    borderBottom: active ? '2px solid var(--gold-dark)' : '2px solid transparent',
                    paddingBottom: '0.25rem',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--botanical-light)' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(200, 220, 192, 0.75)' }}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop right — auth + CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm transition-opacity"
                style={{ color: 'rgba(200, 220, 192, 0.75)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm transition-opacity"
                style={{ color: 'rgba(200, 220, 192, 0.75)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
              >
                Sign In
              </Link>
            )}
            <Link
              href="/courses"
              className="px-6 py-2 rounded-full text-sm btn-primary"
              style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem' }}
            >
              Enroll Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            ref={menuButtonRef}
            className="md:hidden touch-target rounded-md"
            style={{ color: 'var(--botanical-light)' }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Gold gradient border line under nav */}
      <div className="gold-line-nav" aria-hidden="true" />

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        className="md:hidden border-t"
        hidden={!mobileOpen}
        style={{
          borderColor: 'rgba(200,220,192,0.08)',
          background: 'rgba(22, 40, 20, 0.99)',
        }}
      >
        <nav aria-label="Mobile navigation" className="flex flex-col px-5 py-4 gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className="px-4 rounded-md text-sm touch-target"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--botanical-light)' : 'rgba(200, 220, 192, 0.75)',
                }}
              >
                {link.label}
              </Link>
            )
          })}
          <div className="pt-3 mt-1 border-t flex flex-col gap-2" style={{ borderColor: 'rgba(200,220,192,0.08)' }}>
            {user ? (
              <Link href="/dashboard" className="px-4 touch-target text-sm" style={{ color: 'var(--botanical-light)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="px-4 touch-target text-sm" style={{ color: 'var(--botanical-light)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                Sign In
              </Link>
            )}
            <Link
              href="/courses"
              className="text-center btn-primary touch-target"
              style={{ borderRadius: '9999px', padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}
            >
              Enroll Now
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
