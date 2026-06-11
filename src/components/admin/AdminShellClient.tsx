'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, GraduationCap, PenLine, ShoppingBag,
  Users, HeartHandshake, Mail, Receipt, Settings, LogOut, Bell, HelpCircle,
  Menu, X, BookOpen, MessageCircle, type LucideIcon,
} from 'lucide-react'
import { signOutAdmin } from '@/app/actions/admin-auth'

type NavItem = { label: string; href: string; icon: LucideIcon }
type NavSection = { heading?: string; items: NavItem[] }

const navSections: NavSection[] = [
  { items: [{ label: 'Overview', href: '/admin', icon: LayoutDashboard }] },
  {
    heading: 'Content',
    items: [
      { label: 'Courses', href: '/admin/courses', icon: GraduationCap },
      { label: 'Blog',    href: '/admin/blog',    icon: PenLine },
      { label: 'Shop',    href: '/admin/shop',    icon: ShoppingBag },
    ],
  },
  {
    heading: 'Audience',
    items: [
      { label: 'Students',       href: '/admin/students',   icon: Users },
      { label: 'Coaching',       href: '/admin/coaching',   icon: HeartHandshake },
      { label: 'Messages',       href: '/admin/messages',   icon: MessageCircle },
      { label: 'Recipe Library', href: '/admin/recipes',    icon: BookOpen },
      { label: 'Email List',     href: '/admin/email-list', icon: Mail },
    ],
  },
  { heading: 'Revenue', items: [{ label: 'Orders', href: '/admin/orders', icon: Receipt }] },
  { items: [{ label: 'Settings', href: '/admin/settings', icon: Settings }] },
]

const SEGMENT_TITLES: Record<string, string> = {
  '':           'Dashboard Overview',
  'courses':    'Course Manager',
  'blog':       'Blog Manager',
  'coaching':   'Coaching',
  'messages':   'Messages',
  'recipes':    'Recipe Library',
  'students':   'Student Manager',
  'email-list': 'Email List',
  'orders':     'Orders',
  'shop':       'Shop Manager',
  'settings':   'Settings',
}

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Admin'
  const trimmed = pathname.replace(/^\/admin\/?/, '').replace(/\/.*$/, '')
  return SEGMENT_TITLES[trimmed] ?? 'Admin'
}

export default function AdminShellClient({
  adminName,
  adminEmail,
  unreadMessages = 0,
  children,
}: {
  adminName: string
  adminEmail: string
  unreadMessages?: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false)
  }, [pathname])

  const initials = adminName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="admin-shell">

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <Link href="/admin" className="block">
            <h1>Lumora Admin</h1>
            <p>Women&apos;s Wellness</p>
          </Link>
        </div>

        <nav className="flex-grow overflow-y-auto pb-4">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className={section.heading ? 'mt-4' : ''}>
              {section.heading && (
                <div className="admin-sidebar-section">{section.heading}</div>
              )}
              <div className="flex flex-col">
                {section.items.map((item) => {
                  const active = isLinkActive(pathname, item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-nav-link${active ? ' is-active' : ''}`}
                    >
                      <Icon className="lucide" />
                      <span>{item.label}</span>
                      {item.href === '/admin/messages' && unreadMessages > 0 && (
                        <span
                          aria-label={`${unreadMessages} unread`}
                          style={{
                            marginLeft: 'auto', background: 'var(--gold-dark)', color: '#1A2818',
                            fontFamily: 'var(--font-hanken)', fontSize: '0.6875rem', fontWeight: 700,
                            borderRadius: '999px', padding: '0.0625rem 0.4375rem', lineHeight: 1.5,
                          }}
                        >
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <form
          action={signOutAdmin}
          className="px-6 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            type="submit"
            className="flex items-center gap-3 w-full text-left transition-colors"
            style={{
              background: 'transparent', border: 'none',
              padding: '0.5rem 0',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-hanken)', fontSize: '0.875rem',
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </form>
      </aside>

      {/* Topbar */}
      <header className="admin-topbar">
        {/* Hamburger — mobile only */}
        <button
          className="admin-hamburger"
          aria-label="Open navigation menu"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={22} />
        </button>

        <h2>{getPageTitle(pathname)}</h2>

        <div className="flex items-center gap-6">
          <button
            aria-label="Notifications"
            className="transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
          >
            <Bell size={20} />
          </button>
          <button
            aria-label="Help"
            className="transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
          >
            <HelpCircle size={20} />
          </button>

          <div
            className="flex items-center gap-3 pl-4 border-l admin-topbar-identity"
            style={{ borderColor: 'var(--admin-outline-variant)' }}
          >
            <div className="text-right leading-tight">
              <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--admin-on-surface)', margin: 0 }}>
                {adminName}
              </p>
              <p className="uppercase" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--admin-on-surface-variant)', margin: 0 }}>
                {adminEmail}
              </p>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--admin-sage-fixed)', color: 'var(--admin-on-sage-container)', fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              {initials || 'A'}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="admin-main">{children}</main>
    </div>
  )
}
