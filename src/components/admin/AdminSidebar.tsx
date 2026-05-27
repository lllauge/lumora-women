'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  GraduationCap,
  PenLine,
  ShoppingBag,
  Users,
  Mail,
  Receipt,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { signOutAdmin } from '@/app/actions/admin-auth'

type NavItem = { label: string; href: string; icon: LucideIcon }
type NavSection = { heading?: string; items: NavItem[] }

const navSections: NavSection[] = [
  {
    items: [{ label: 'Overview', href: '/admin', icon: LayoutDashboard }],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Courses', href: '/admin/courses',   icon: GraduationCap },
      { label: 'Blog',    href: '/admin/blog',      icon: PenLine },
      { label: 'Shop',    href: '/admin/shop',      icon: ShoppingBag },
    ],
  },
  {
    heading: 'Audience',
    items: [
      { label: 'Students',   href: '/admin/students',   icon: Users },
      { label: 'Email List', href: '/admin/email-list', icon: Mail },
    ],
  },
  {
    heading: 'Revenue',
    items: [{ label: 'Orders', href: '/admin/orders', icon: Receipt }],
  },
  {
    items: [{ label: 'Settings', href: '/admin/settings', icon: Settings }],
  },
]

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="admin-sidebar">
      {/* Brand */}
      <div className="admin-sidebar-brand">
        <Link href="/admin" className="block">
          <h1>Lumora Admin</h1>
          <p>Women&apos;s Wellness</p>
        </Link>
      </div>

      {/* Nav */}
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
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign out — pinned bottom */}
      <form
        action={signOutAdmin}
        className="px-6 py-4 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <button
          type="submit"
          className="flex items-center gap-3 w-full text-left transition-colors"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.5rem 0',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--admin-bg)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </form>
    </aside>
  )
}
