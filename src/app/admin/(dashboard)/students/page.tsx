import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  avatarPaletteIndex,
  formatNumber,
  formatShortDate,
  getInitials,
} from '@/utils/format'
import StudentSearch from '@/components/admin/StudentSearch'
import StudentDrawer from '@/components/admin/StudentDrawer'

export const metadata: Metadata = {
  title: 'Student Manager',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 20

type SearchParams = Promise<{ q?: string; page?: string }>

type StudentRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
}

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--admin-sage-fixed)',   fg: 'var(--admin-on-sage-container)' },
  { bg: 'var(--admin-rose-fixed)',   fg: 'var(--admin-on-rose-fixed)' },
  { bg: 'var(--admin-celadon-pale)', fg: 'var(--admin-primary-container)' },
  { bg: 'var(--admin-sand-fixed)',   fg: 'var(--admin-on-sand-fixed)' },
]

// ─── Data ─────────────────────────────────────────────────────────────────────

async function loadStudents(sp: Awaited<SearchParams>) {
  const supabase = await createClient()

  const q    = (sp.q ?? '').trim()
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('users')
    .select('id, email, first_name, last_name, created_at', { count: 'exact' })
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  if (q) {
    // Match name OR email — Supabase .or() with comma-separated filters
    const escaped = q.replace(/[%,]/g, '')
    query = query.or(
      `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
    )
  }

  const { data, count } = await query.range(from, to)
  return {
    students: (data ?? []) as StudentRow[],
    total: count ?? 0,
    page,
    filters: { q },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const empty = { students: [] as StudentRow[], total: 0, page: 1, filters: { q: sp.q ?? '' } }
  const data = supabaseConfigured ? await loadStudents(sp) : empty
  const { students, total, page, filters } = data

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (p > 1)     params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/students?${qs}` : '/admin/students'
  }

  return (
    <div className="space-y-6">

      {/* Filters / search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <StudentSearch />
        <div
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            color: 'var(--admin-on-surface-variant)',
          }}
        >
          {formatNumber(total)} {total === 1 ? 'student' : 'students'}
        </div>
      </div>

      {/* Table card */}
      <div className="admin-card overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Date Joined</th>
                <th className="text-right" style={{ width: '80px' }}>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <p style={{
                      fontFamily: 'var(--font-eb-garamond)',
                      fontSize: '1.125rem',
                      color: 'var(--admin-on-surface-variant)',
                    }}>
                      {filters.q
                        ? `No students match "${filters.q}".`
                        : 'No students yet — they’ll appear here when people sign up.'}
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const fullName =
                    [student.first_name, student.last_name].filter(Boolean).join(' ').trim() ||
                    student.email
                  const initials = getInitials(fullName)
                  const palette = AVATAR_PALETTE[avatarPaletteIndex(student.id)]

                  return (
                    <tr key={student.id} className="cursor-pointer">
                      <td>
                        <StudentDrawer
                          userId={student.id}
                          initialName={fullName}
                          trigger={
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' }}
                            >
                              <span
                                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  background: palette.bg,
                                  color: palette.fg,
                                  fontFamily: 'var(--font-hanken)',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {initials}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--font-hanken)',
                                  fontSize: '0.9375rem',
                                  fontWeight: 600,
                                  color: 'var(--admin-on-surface)',
                                }}
                              >
                                {fullName}
                              </span>
                            </button>
                          }
                        />
                      </td>
                      <td style={{ color: 'var(--admin-on-surface-variant)' }}>{student.email}</td>
                      <td style={{ color: 'var(--admin-on-surface-variant)' }}>
                        {formatShortDate(student.created_at)}
                      </td>
                      <td className="text-right">
                        <StudentDrawer
                          userId={student.id}
                          initialName={fullName}
                          trigger={
                            <button
                              type="button"
                              aria-label={`View ${fullName} details`}
                              className="px-3 py-1.5 rounded transition-colors"
                              style={{
                                fontFamily: 'var(--font-hanken)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                letterSpacing: '0.04em',
                                color: 'var(--admin-primary-container)',
                                background: 'transparent',
                                border: '1px solid var(--admin-outline-variant)',
                                cursor: 'pointer',
                              }}
                            >
                              View
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: 'var(--admin-surface-low)' }}
          >
            <p style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              color: 'var(--admin-on-surface-variant)',
            }}>
              Showing {formatNumber(start)} to {formatNumber(end)} of {formatNumber(total)}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link href={buildHref(page - 1)} aria-label="Previous page"
                      className="p-2 rounded-lg transition-colors"
                      style={{ border: '1px solid var(--admin-outline-variant)', background: 'var(--admin-surface)' }}>
                  <ChevronLeft size={18} />
                </Link>
              ) : (
                <span className="p-2 opacity-30" style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: '0.5rem' }}>
                  <ChevronLeft size={18} />
                </span>
              )}
              <span
                className="px-4 inline-flex items-center"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--admin-on-surface)',
                }}
              >
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={buildHref(page + 1)} aria-label="Next page"
                      className="p-2 rounded-lg transition-colors"
                      style={{ border: '1px solid var(--admin-outline-variant)', background: 'var(--admin-surface)' }}>
                  <ChevronRight size={18} />
                </Link>
              ) : (
                <span className="p-2 opacity-30" style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: '0.5rem' }}>
                  <ChevronRight size={18} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
