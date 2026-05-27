import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Pencil, TrendingUp, Users, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatNumber, formatShortDate } from '@/utils/format'
import CourseFilters from '@/components/admin/CourseFilters'
import ArchiveCourseButton from '@/components/admin/ArchiveCourseButton'

export const metadata: Metadata = {
  title: 'Course Manager',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 10

type SearchParams = Promise<{
  q?: string
  status?: string
  type?: string
  page?: string
}>

type CourseRow = {
  id: string
  title: string
  subtitle: string | null
  price: number | string
  is_free: boolean
  thumbnail_url: string | null
  published: boolean
  created_at: string
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function loadCourses(searchParams: Awaited<SearchParams>) {
  const supabase = await createClient()

  const q       = (searchParams.q ?? '').trim()
  const status  = (searchParams.status ?? 'all').toLowerCase()
  const type    = (searchParams.type ?? 'all').toLowerCase()
  const page    = Math.max(1, Number(searchParams.page ?? '1') || 1)
  const from    = (page - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  // Base query — filters applied at the DB level
  let query = supabase
    .from('courses')
    .select('id, title, subtitle, price, is_free, thumbnail_url, published, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q)                          query = query.ilike('title', `%${q}%`)
  if (status === 'published')     query = query.eq('published', true)
  else if (status === 'draft')    query = query.eq('published', false)
  if (type === 'free')            query = query.eq('is_free', true)
  else if (type === 'paid')       query = query.eq('is_free', false)

  const { data: courses, count } = await query.range(from, to)

  const safeCourses: CourseRow[] = (courses ?? []) as CourseRow[]

  // Enrollment counts per course (only need ids that appear on this page)
  const courseIds = safeCourses.map((c) => c.id)
  const enrollmentCounts = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .in('course_id', courseIds)
    for (const e of (enrollments ?? []) as { course_id: string }[]) {
      enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) ?? 0) + 1)
    }
  }

  return {
    courses: safeCourses,
    enrollmentCounts,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    filters: { q, status, type },
  }
}

async function loadInsightCards() {
  const supabase = await createClient()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = thisMonthStart

  const [
    paidOrdersQ,
    paidOrdersThisMonthQ,
    paidOrdersLastMonthQ,
    enrollmentsQ,
    lessonsQ,
    progressQ,
  ] = await Promise.all([
    supabase.from('orders').select('amount').eq('status', 'paid'),
    supabase.from('orders').select('amount').eq('status', 'paid')
      .gte('created_at', thisMonthStart.toISOString()),
    supabase.from('orders').select('amount').eq('status', 'paid')
      .gte('created_at', lastMonthStart.toISOString()).lt('created_at', lastMonthEnd.toISOString()),
    // Pull a slim projection to compute completion + active-student count.
    supabase.from('enrollments').select('user_id, course_id'),
    // module_id → so we can map a lesson back to its course via modules table later
    supabase.from('lessons').select('id, module_id'),
    supabase.from('lesson_progress').select('user_id, lesson_id, completed'),
  ])

  const sum = (rows: { amount: number | string }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.amount ?? 0), 0)

  const totalRevenue        = sum(paidOrdersQ.data)
  const revenueThisMonth    = sum(paidOrdersThisMonthQ.data)
  const revenueLastMonth    = sum(paidOrdersLastMonthQ.data)
  const revenueTrendPct =
    revenueLastMonth === 0
      ? null
      : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100

  // Active students = unique user ids across all enrollments
  const enrollments = (enrollmentsQ.data ?? []) as { user_id: string; course_id: string }[]
  const activeStudents = new Set(enrollments.map((e) => e.user_id)).size

  // Course completion — average over enrollments. For each enrollment, count
  // lessons in that course that this user has marked completed, divided by
  // total lessons in the course.
  let completionPct = 0
  const lessons = (lessonsQ.data ?? []) as { id: string; module_id: string }[]
  const progress = (progressQ.data ?? []) as { user_id: string; lesson_id: string; completed: boolean }[]

  if (enrollments.length > 0 && lessons.length > 0) {
    // We need lesson → course mapping. Pull modules.
    const moduleIds = Array.from(new Set(lessons.map((l) => l.module_id)))
    let lessonToCourse = new Map<string, string>()
    if (moduleIds.length > 0) {
      const { data: modules } = await supabase
        .from('modules')
        .select('id, course_id')
        .in('id', moduleIds)
      const moduleToCourse = new Map(
        ((modules ?? []) as { id: string; course_id: string }[]).map((m) => [m.id, m.course_id])
      )
      lessonToCourse = new Map(
        lessons.map((l) => [l.id, moduleToCourse.get(l.module_id) ?? ''])
      )
    }

    // Total lessons per course
    const totalByCourse = new Map<string, number>()
    for (const l of lessons) {
      const cid = lessonToCourse.get(l.id)
      if (!cid) continue
      totalByCourse.set(cid, (totalByCourse.get(cid) ?? 0) + 1)
    }

    // Completed lessons per (user, course)
    const completedByUserCourse = new Map<string, number>()
    for (const p of progress) {
      if (!p.completed) continue
      const cid = lessonToCourse.get(p.lesson_id)
      if (!cid) continue
      const key = `${p.user_id}::${cid}`
      completedByUserCourse.set(key, (completedByUserCourse.get(key) ?? 0) + 1)
    }

    let pctSum = 0
    let counted = 0
    for (const e of enrollments) {
      const total = totalByCourse.get(e.course_id) ?? 0
      if (total === 0) continue
      const completed = completedByUserCourse.get(`${e.user_id}::${e.course_id}`) ?? 0
      pctSum += Math.min(1, completed / total)
      counted++
    }
    completionPct = counted > 0 ? Math.round((pctSum / counted) * 100) : 0
  }

  return {
    totalRevenue,
    revenueTrendPct,
    activeStudents,
    completionPct,
  }
}

// ─── UI bits ──────────────────────────────────────────────────────────────────

function StatusPill({ published }: { published: boolean }) {
  return published ? (
    <span
      className="inline-flex px-3 py-1 rounded-full"
      style={{
        background: 'var(--admin-celadon-pale)',
        color: 'var(--admin-primary-container)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      Published
    </span>
  ) : (
    <span
      className="inline-flex px-3 py-1 rounded-full"
      style={{
        background: 'var(--admin-rose-fixed)',
        color: 'var(--admin-on-rose-fixed)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      Draft
    </span>
  )
}

function TypePill({ isFree }: { isFree: boolean }) {
  return isFree ? (
    <span
      className="inline-flex px-3 py-1 rounded-full"
      style={{
        background: 'var(--admin-rose-container)',
        color: 'var(--admin-on-rose-fixed)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      Free
    </span>
  ) : (
    <span
      className="inline-flex px-3 py-1 rounded-full"
      style={{
        background: 'var(--admin-sage-container)',
        color: 'var(--admin-on-sage-container)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      Paid
    </span>
  )
}

function ThumbCell({ course }: { course: CourseRow }) {
  return (
    <div
      className="w-16 h-10 rounded overflow-hidden flex items-center justify-center"
      style={{ background: 'var(--admin-surface-container)' }}
    >
      {course.thumbnail_url ? (
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <span style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '1.125rem',
          color: 'var(--admin-outline-variant)',
        }}>L</span>
      )}
    </div>
  )
}

function Pagination({
  page, pageSize, total, filters,
}: {
  page: number
  pageSize: number
  total: number
  filters: { q: string; status: string; type: string }
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null

  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (filters.q)              params.set('q', filters.q)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.type   !== 'all') params.set('type',   filters.type)
    if (p > 1)                   params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/courses?${qs}` : '/admin/courses'
  }

  // Smart page window: 1 … (p-1) p (p+1) … last
  const pageSet = new Set<number>([1, totalPages, page, page - 1, page + 1])
  const pageList = Array.from(pageSet)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)

  const items: Array<number | 'gap'> = []
  let prev = 0
  for (const p of pageList) {
    if (prev && p - prev > 1) items.push('gap')
    items.push(p)
    prev = p
  }

  return (
    <div
      className="px-6 py-4 flex items-center justify-between"
      style={{
        background: 'var(--admin-surface-low)',
        borderTop: '1px solid var(--admin-outline-variant)',
      }}
    >
      <p style={{
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.8125rem',
        color: 'var(--admin-on-surface-variant)',
      }}>
        Showing {formatNumber(start)} to {formatNumber(end)} of {formatNumber(total)} {total === 1 ? 'course' : 'courses'}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} aria-label="Previous page" className="p-2 rounded transition-colors hover:bg-admin-surface-container">
            <ChevronLeft size={18} />
          </Link>
        ) : (
          <span className="p-2 opacity-30"><ChevronLeft size={18} /></span>
        )}
        {items.map((it, i) =>
          it === 'gap' ? (
            <span key={`gap-${i}`} className="px-1" style={{ color: 'var(--admin-on-surface-variant)' }}>…</span>
          ) : it === page ? (
            <span
              key={it}
              className="w-8 h-8 rounded inline-flex items-center justify-center"
              style={{
                background: 'var(--admin-primary-container)',
                color: 'var(--admin-bg)',
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.8125rem',
                fontWeight: 700,
              }}
            >
              {it}
            </span>
          ) : (
            <Link
              key={it}
              href={buildHref(it)}
              className="w-8 h-8 rounded inline-flex items-center justify-center transition-colors"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              {it}
            </Link>
          )
        )}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} aria-label="Next page" className="p-2 rounded transition-colors hover:bg-admin-surface-container">
            <ChevronRight size={18} />
          </Link>
        ) : (
          <span className="p-2 opacity-30"><ChevronRight size={18} /></span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminCoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const empty = {
    courses: [] as CourseRow[],
    enrollmentCounts: new Map<string, number>(),
    total: 0, page: 1, pageSize: PAGE_SIZE,
    filters: { q: sp.q ?? '', status: sp.status ?? 'all', type: sp.type ?? 'all' },
  }
  const emptyInsights = { totalRevenue: 0, revenueTrendPct: null as number | null, activeStudents: 0, completionPct: 0 }

  const [data, insights] = supabaseConfigured
    ? await Promise.all([loadCourses(sp), loadInsightCards()])
    : [empty, emptyInsights]

  const { courses, enrollmentCounts, total, page, pageSize, filters } = data

  return (
    <div className="space-y-6">

      {/* Filters bar */}
      <CourseFilters />

      {/* Table card */}
      <div
        className="admin-card overflow-hidden"
        style={{ borderRadius: '0.75rem' }}
      >
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Title</th>
                <th>Type</th>
                <th>Price</th>
                <th>Status</th>
                <th className="text-center">Enrolled</th>
                <th>Created Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.125rem', color: 'var(--admin-on-surface-variant)' }}>
                      {filters.q || filters.status !== 'all' || filters.type !== 'all'
                        ? 'No courses match those filters.'
                        : 'No courses yet — create your first one.'}
                    </p>
                    <Link
                      href="/admin/courses/new"
                      className="admin-btn-primary mt-4 inline-flex"
                    >
                      + Create New Course
                    </Link>
                  </td>
                </tr>
              ) : (
                courses.map((course) => {
                  const enrolled = enrollmentCounts.get(course.id) ?? 0
                  return (
                    <tr key={course.id}>
                      <td><ThumbCell course={course} /></td>
                      <td>
                        <Link
                          href={`/admin/courses/edit/${course.id}`}
                          style={{
                            fontFamily: 'var(--font-eb-garamond)',
                            fontSize: '1.0625rem',
                            fontWeight: 500,
                            color: 'var(--admin-primary-container)',
                            textDecoration: 'none',
                          }}
                          className="hover:underline"
                        >
                          {course.title}
                        </Link>
                      </td>
                      <td><TypePill isFree={course.is_free} /></td>
                      <td style={{ color: 'var(--admin-on-surface)' }}>
                        {course.is_free
                          ? <span style={{ color: 'var(--admin-on-surface-variant)' }}>—</span>
                          : formatCurrency(course.price, { precise: true })}
                      </td>
                      <td><StatusPill published={course.published} /></td>
                      <td className="text-center" style={{ color: 'var(--admin-on-surface)' }}>
                        {formatNumber(enrolled)}
                      </td>
                      <td style={{ color: 'var(--admin-on-surface-variant)' }}>
                        {formatShortDate(course.created_at)}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/admin/courses/edit/${course.id}`}
                            aria-label={`Edit ${course.title}`}
                            title="Edit"
                            className="p-1.5 rounded transition-colors"
                            style={{ color: 'var(--admin-on-surface-variant)' }}
                          >
                            <Pencil size={18} />
                          </Link>
                          <ArchiveCourseButton courseId={course.id} courseTitle={course.title} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={pageSize} total={total} filters={filters} />
      </div>

      {/* ── Insight cards (bento) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
        {/* Total Revenue — dark forest */}
        <div
          className="p-6 rounded-xl flex flex-col justify-between"
          style={{
            background: 'var(--admin-primary-container)',
            color: 'var(--admin-bg)',
            minHeight: '160px',
          }}
        >
          <div>
            <p className="uppercase" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              opacity: 0.7,
            }}>
              Total Revenue
            </p>
            <h3 className="mt-2" style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '2.25rem',
              fontWeight: 500,
              color: 'var(--admin-bg)',
            }}>
              {formatCurrency(insights.totalRevenue, { precise: true })}
            </h3>
          </div>
          <div
            className="mt-4 flex items-center"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--admin-celadon)',
            }}
          >
            <TrendingUp size={16} style={{ marginRight: '0.375rem' }} />
            <span>
              {insights.revenueTrendPct == null
                ? 'No prior month to compare'
                : `${insights.revenueTrendPct >= 0 ? '+' : ''}${insights.revenueTrendPct.toFixed(1)}% from last month`}
            </span>
          </div>
        </div>

        {/* Active Students — white */}
        <div
          className="admin-card p-6 flex flex-col justify-between"
          style={{ minHeight: '160px' }}
        >
          <div>
            <p className="uppercase" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'var(--admin-on-surface-variant)',
            }}>
              Active Students
            </p>
            <h3 className="mt-2" style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '2.25rem',
              fontWeight: 500,
              color: 'var(--admin-primary-container)',
            }}>
              {formatNumber(insights.activeStudents)}
            </h3>
          </div>
          <div
            className="mt-4 flex items-center"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--admin-primary-container)',
            }}
          >
            <Users size={16} style={{ marginRight: '0.375rem' }} />
            <span>Unique students across all courses</span>
          </div>
        </div>

        {/* Course Completion — sage */}
        <div
          className="p-6 rounded-xl flex flex-col justify-between"
          style={{
            background: 'var(--admin-sage-container)',
            minHeight: '160px',
          }}
        >
          <div>
            <p className="uppercase" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'var(--admin-on-sage-container)',
            }}>
              Course Completion
            </p>
            <h3 className="mt-2" style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '2.25rem',
              fontWeight: 500,
              color: 'var(--admin-on-sage-container)',
            }}>
              {insights.completionPct}%
            </h3>
          </div>
          <div className="mt-4">
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.4)', height: '6px' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, insights.completionPct)}%`,
                  background: 'var(--admin-primary)',
                }}
              />
            </div>
            <p className="mt-2 flex items-center" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--admin-on-sage-container)',
            }}>
              <Target size={14} style={{ marginRight: '0.375rem' }} />
              Average across all enrollments
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
