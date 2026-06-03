import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Users,
  Wallet,
  Mail,
  BookOpen,
  HeartHandshake,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  avatarPaletteIndex,
  currentMonthRange,
  formatCompact,
  formatCurrency,
  formatRelativeTime,
  formatShortDate,
  formatTrendPercent,
  getInitials,
  previousMonthRange,
} from '@/utils/format'

export const metadata: Metadata = {
  title: 'Dashboard Overview',
  robots: { index: false, follow: false },
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrollmentRow = {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  users:   { first_name: string | null; last_name: string | null; email: string | null } | null
  courses: { title: string | null; price: number | string | null; is_free: boolean | null } | null
}

type OrderRow = {
  id: string
  user_id: string | null
  course_id: string | null
  amount: number | string
  status: string
  created_at: string
  users:   { first_name: string | null; last_name: string | null; email: string | null } | null
  courses: { title: string | null } | null
}

type SubscriberRow = {
  id: string
  email: string
  first_name: string | null
  subscribed_at: string
}

type CourseRow = {
  id: string
  title: string
  subtitle: string | null
  thumbnail_url: string | null
  published: boolean
}

// ─── Avatar palette (rotates by stable hash so it's the same each render) ────

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--admin-sage-fixed)',   fg: 'var(--admin-on-sage-container)' },
  { bg: 'var(--admin-rose-fixed)',   fg: 'var(--admin-on-rose-fixed)' },
  { bg: 'var(--admin-celadon-pale)', fg: 'var(--admin-primary-container)' },
  { bg: 'var(--admin-sand-fixed)',   fg: 'var(--admin-on-sand-fixed)' },
]

// ─── Data fetching ────────────────────────────────────────────────────────────

async function loadDashboardData() {
  const supabase = await createClient()
  const now = new Date()
  const thisMonth = currentMonthRange(now)
  const lastMonth = previousMonthRange(now)

  // Parallel — Supabase counts use `head: true` so no rows transit.
  const [
    studentsTotalQ,
    studentsThisMonthQ,
    studentsLastMonthQ,
    revenueThisMonthQ,
    revenueLastMonthQ,
    subscribersTotalQ,
    subscribersThisMonthQ,
    subscribersLastMonthQ,
    activeCoursesQ,
    draftCoursesQ,
    recentEnrollmentsQ,
    recentOrdersQ,
    recentSubscribersQ,
    coursesForRankingQ,
    enrollmentsForRankingQ,
  ] = await Promise.all([
    supabase.from('enrollments').select('id', { count: 'exact', head: true }),
    supabase.from('enrollments').select('id', { count: 'exact', head: true })
      .gte('enrolled_at', thisMonth.start.toISOString()).lt('enrolled_at', thisMonth.end.toISOString()),
    supabase.from('enrollments').select('id', { count: 'exact', head: true })
      .gte('enrolled_at', lastMonth.start.toISOString()).lt('enrolled_at', lastMonth.end.toISOString()),

    supabase.from('orders').select('amount').eq('status', 'paid')
      .gte('created_at', thisMonth.start.toISOString()).lt('created_at', thisMonth.end.toISOString()),
    supabase.from('orders').select('amount').eq('status', 'paid')
      .gte('created_at', lastMonth.start.toISOString()).lt('created_at', lastMonth.end.toISOString()),

    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true })
      .gte('subscribed_at', thisMonth.start.toISOString()).lt('subscribed_at', thisMonth.end.toISOString()),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true })
      .gte('subscribed_at', lastMonth.start.toISOString()).lt('subscribed_at', lastMonth.end.toISOString()),

    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('published', false),

    supabase.from('enrollments')
      .select('id, user_id, course_id, enrolled_at, users(first_name, last_name, email), courses(title, price, is_free)')
      .order('enrolled_at', { ascending: false })
      .limit(10),

    supabase.from('orders')
      .select('id, user_id, course_id, amount, status, created_at, users(first_name, last_name, email), courses(title)')
      .order('created_at', { ascending: false })
      .limit(20),

    supabase.from('email_subscribers')
      .select('id, email, first_name, subscribed_at')
      .order('subscribed_at', { ascending: false })
      .limit(20),

    supabase.from('courses').select('id, title, subtitle, thumbnail_url, published'),
    supabase.from('enrollments').select('course_id'),
  ])

  const sumPaid = (rows: { amount: number | string }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.amount ?? 0), 0)

  const revenueThisMonth = sumPaid(revenueThisMonthQ.data)
  const revenueLastMonth = sumPaid(revenueLastMonthQ.data)

  // ── Top courses: count enrollments per course, take top 3 ──────────────────
  const enrollmentCountByCourse = new Map<string, number>()
  for (const row of (enrollmentsForRankingQ.data ?? []) as { course_id: string }[]) {
    if (!row.course_id) continue
    enrollmentCountByCourse.set(row.course_id, (enrollmentCountByCourse.get(row.course_id) ?? 0) + 1)
  }
  const coursesById = new Map<string, CourseRow>(
    ((coursesForRankingQ.data ?? []) as CourseRow[]).map((c) => [c.id, c])
  )
  const topCourses = Array.from(enrollmentCountByCourse.entries())
    .map(([courseId, count]) => ({ course: coursesById.get(courseId), count }))
    .filter((x): x is { course: CourseRow; count: number } => !!x.course)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
  const topCourseLeader = topCourses[0]?.count ?? 0

  // ── Activity feed: merge enrollments / orders / subscribers, sort desc ────
  type Activity = {
    id: string
    kind: 'enrollment' | 'order' | 'subscriber'
    when: string
    title: string
    detail: string
  }
  const activity: Activity[] = []

  for (const e of ((recentEnrollmentsQ.data ?? []) as unknown as EnrollmentRow[])) {
    const name =
      [e.users?.first_name, e.users?.last_name].filter(Boolean).join(' ').trim() ||
      e.users?.email ||
      'A student'
    activity.push({
      id: `enroll-${e.id}`,
      kind: 'enrollment',
      when: e.enrolled_at,
      title: 'New Enrollment',
      detail: `${name} enrolled in ${e.courses?.title ?? 'a course'}.`,
    })
  }
  for (const o of ((recentOrdersQ.data ?? []) as unknown as OrderRow[])) {
    if (o.status !== 'paid') continue
    const name =
      [o.users?.first_name, o.users?.last_name].filter(Boolean).join(' ').trim() ||
      o.users?.email ||
      'A customer'
    activity.push({
      id: `order-${o.id}`,
      kind: 'order',
      when: o.created_at,
      title: 'Payment Received',
      detail: `${name} purchased ${o.courses?.title ?? 'a course'} for ${formatCurrency(o.amount, { precise: true })}.`,
    })
  }
  for (const s of ((recentSubscribersQ.data ?? []) as SubscriberRow[])) {
    const name = s.first_name?.trim() || s.email
    activity.push({
      id: `sub-${s.id}`,
      kind: 'subscriber',
      when: s.subscribed_at,
      title: 'Newsletter Signup',
      detail: `${name} joined the Inner Circle.`,
    })
  }
  activity.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
  const recentActivity = activity.slice(0, 20)

  return {
    stats: {
      students: {
        total: studentsTotalQ.count ?? 0,
        thisMonth: studentsThisMonthQ.count ?? 0,
        lastMonth: studentsLastMonthQ.count ?? 0,
      },
      revenue: { thisMonth: revenueThisMonth, lastMonth: revenueLastMonth },
      subscribers: {
        total: subscribersTotalQ.count ?? 0,
        thisMonth: subscribersThisMonthQ.count ?? 0,
        lastMonth: subscribersLastMonthQ.count ?? 0,
      },
      courses: { active: activeCoursesQ.count ?? 0, draft: draftCoursesQ.count ?? 0 },
    },
    recentEnrollments: (recentEnrollmentsQ.data ?? []) as unknown as EnrollmentRow[],
    recentActivity,
    topCourses,
    topCourseLeader,
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function TrendPill({
  current,
  previous,
  inverted = false,
}: {
  current: number
  previous: number
  /** When true (e.g. drafts), a decrease is "good". */
  inverted?: boolean
}) {
  if (previous === 0 && current === 0) {
    return <Pill tone="neutral" Icon={Minus}>Stable</Pill>
  }
  const text = formatTrendPercent(current, previous)
  const isUp = current > previous
  const isDown = current < previous
  const positive = inverted ? isDown : isUp
  const negative = inverted ? isUp : isDown
  const tone = positive ? 'success' : negative ? 'error' : 'neutral'
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus
  return <Pill tone={tone} Icon={Icon}>{text}</Pill>
}

function Pill({
  tone,
  Icon,
  children,
}: {
  tone: 'success' | 'error' | 'neutral'
  Icon?: LucideIcon
  children: React.ReactNode
}) {
  return (
    <span className={`admin-pill admin-pill-${tone}`}>
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  )
}

function StatCard({
  Icon,
  label,
  value,
  trendNode,
  subtext,
}: {
  Icon: LucideIcon
  label: string
  value: string
  trendNode: React.ReactNode
  subtext: string
}) {
  return (
    <div className="admin-card p-6">
      <div className="flex justify-between items-start mb-4">
        <Icon size={20} style={{ color: 'var(--admin-primary-container)' }} />
        {trendNode}
      </div>
      <p
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'var(--admin-on-surface-variant)',
        }}
      >
        {label}
      </p>
      <h3
        style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '2rem',
          fontWeight: 500,
          color: 'var(--admin-on-surface)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </h3>
      <p
        className="mt-2 italic"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.8125rem',
          color: 'var(--admin-on-surface-variant)',
        }}
      >
        {subtext}
      </p>
    </div>
  )
}

function StudentCell({ row }: { row: EnrollmentRow }) {
  const fullName =
    [row.users?.first_name, row.users?.last_name].filter(Boolean).join(' ').trim() ||
    row.users?.email ||
    'Unknown'
  const email = row.users?.email ?? ''
  const initials = getInitials(fullName)
  const palette = AVATAR_PALETTE[avatarPaletteIndex(row.user_id)]

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: palette.bg,
          color: palette.fg,
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        {initials}
      </div>
      <div>
        <p
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}
        >
          {fullName}
        </p>
        {email && (
          <p
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              color: 'var(--admin-on-surface-variant)',
              margin: 0,
            }}
          >
            {email}
          </p>
        )}
      </div>
    </div>
  )
}

const ACTIVITY_DOT_COLOR: Record<'enrollment' | 'order' | 'subscriber', string> = {
  enrollment: 'var(--admin-celadon)',
  order:      'var(--admin-sage-container)',
  subscriber: 'var(--admin-sand-fixed)',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase isn't configured locally, render the shell with zeroes
  // rather than crashing.
  const data = supabaseConfigured
    ? await loadDashboardData()
    : {
        stats: {
          students:   { total: 0, thisMonth: 0, lastMonth: 0 },
          revenue:    { thisMonth: 0, lastMonth: 0 },
          subscribers:{ total: 0, thisMonth: 0, lastMonth: 0 },
          courses:    { active: 0, draft: 0 },
        },
        recentEnrollments: [] as EnrollmentRow[],
        recentActivity:    [] as Array<{ id: string; kind: 'enrollment' | 'order' | 'subscriber'; when: string; title: string; detail: string }>,
        topCourses:        [] as Array<{ course: CourseRow; count: number }>,
        topCourseLeader:   0,
      }

  const { stats, recentEnrollments, recentActivity, topCourses, topCourseLeader } = data

  return (
    <div className="space-y-6">

      {/* ── Row 1: Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          Icon={Users}
          label="Total Students"
          value={formatCompact(stats.students.total)}
          trendNode={<TrendPill current={stats.students.thisMonth} previous={stats.students.lastMonth} />}
          subtext={stats.students.thisMonth > 0
            ? `${stats.students.thisMonth} enrolled this month`
            : 'No new enrollments this month'}
        />
        <StatCard
          Icon={Wallet}
          label="Total Revenue"
          value={formatCurrency(stats.revenue.thisMonth)}
          trendNode={<TrendPill current={stats.revenue.thisMonth} previous={stats.revenue.lastMonth} />}
          subtext="This month, paid orders only"
        />
        <StatCard
          Icon={Mail}
          label="Subscribers"
          value={formatCompact(stats.subscribers.total)}
          trendNode={<TrendPill current={stats.subscribers.thisMonth} previous={stats.subscribers.lastMonth} />}
          subtext={stats.subscribers.thisMonth > 0
            ? `+${stats.subscribers.thisMonth} this month`
            : 'Weekly newsletter reach'}
        />
        <StatCard
          Icon={BookOpen}
          label="Active Courses"
          value={stats.courses.active.toString()}
          trendNode={
            stats.courses.draft > 0
              ? <Pill tone="neutral" Icon={Minus}>{stats.courses.draft} draft</Pill>
              : <Pill tone="neutral" Icon={Minus}>Stable</Pill>
          }
          subtext={stats.courses.draft > 0
            ? `${stats.courses.draft} currently in draft`
            : 'All courses published'}
        />
      </div>

      {/* ── Coaching shortcut ─────────────────────────────────────────────── */}
      <div
        className="admin-card p-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
        style={{
          background: 'linear-gradient(135deg, var(--admin-surface) 0%, var(--admin-sage-fixed) 100%)',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: 'var(--admin-primary-container)',
              color: 'var(--admin-bg)',
            }}
          >
            <HeartHandshake size={22} />
          </div>
          <div>
            <p
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              1:1 Coaching
            </p>
            <h3
              style={{
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--admin-on-surface)',
                lineHeight: 1.1,
              }}
            >
              Send a paid coaching checkout link
            </h3>
            <p
              className="mt-2"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.9375rem',
                color: 'var(--admin-on-surface-variant)',
                maxWidth: '42rem',
              }}
            >
              Use this after a fit call to invite a client to pay first, then complete her private onboarding form.
            </p>
          </div>
        </div>
        <Link
          href="/admin/coaching"
          className="admin-btn-primary w-full md:w-auto"
          style={{ minHeight: '44px' }}
        >
          Open Coaching
          <ArrowUpRight size={16} />
        </Link>
      </div>

      {/* ── Row 2: Recent Enrollments + Activity Feed ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Enrollments — 2 cols */}
        <div className="lg:col-span-2 admin-card overflow-hidden">
          <div
            className="px-6 py-5 flex justify-between items-center"
            style={{ borderBottom: '1px solid var(--admin-outline-variant)' }}
          >
            <h4
              style={{
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--admin-on-surface)',
              }}
            >
              Recent Enrollments
            </h4>
            <a
              href="/admin/students"
              className="hover:underline"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--admin-sage)',
              }}
            >
              View All
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10" style={{ color: 'var(--admin-on-surface-variant)' }}>
                      No enrollments yet.
                    </td>
                  </tr>
                ) : (
                  recentEnrollments.map((row) => (
                    <tr key={row.id}>
                      <td><StudentCell row={row} /></td>
                      <td style={{ color: 'var(--admin-on-surface)' }}>
                        {row.courses?.title ?? <span style={{ color: 'var(--admin-on-surface-variant)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--admin-on-surface-variant)' }}>
                        {formatShortDate(row.enrolled_at)}
                      </td>
                      <td className="text-right" style={{
                        fontWeight: 700,
                        color: 'var(--admin-primary-container)',
                      }}>
                        {row.courses?.is_free
                          ? 'Free'
                          : row.courses?.price != null
                            ? formatCurrency(row.courses.price, { precise: true })
                            : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed — 1 col */}
        <div className="admin-card p-6">
          <h4
            className="mb-6"
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--admin-on-surface)',
            }}
          >
            Recent Activity
          </h4>

          {recentActivity.length === 0 ? (
            <p
              className="italic py-4"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.875rem',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              Nothing yet — activity will appear here as students enroll and subscribe.
            </p>
          ) : (
            <div className="relative space-y-5">
              {/* vertical rail */}
              <div
                aria-hidden
                className="absolute top-2 bottom-2"
                style={{
                  left: '10px',
                  width: '1px',
                  background: 'var(--admin-outline-variant)',
                }}
              />
              {recentActivity.map((item) => (
                <div key={item.id} className="flex gap-4 relative">
                  <div
                    className="mt-1 w-[22px] h-[22px] rounded-full flex-shrink-0 z-10"
                    style={{
                      background: ACTIVITY_DOT_COLOR[item.kind],
                      border: '4px solid var(--admin-surface)',
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      style={{
                        fontFamily: 'var(--font-hanken)',
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                        color: 'var(--admin-on-surface)',
                        margin: 0,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{item.title}</span>
                      <span style={{ color: 'var(--admin-on-surface-variant)' }}> — {item.detail}</span>
                    </p>
                    <span
                      className="block mt-1"
                      style={{
                        fontFamily: 'var(--font-hanken)',
                        fontSize: '0.6875rem',
                        color: 'var(--admin-on-surface-variant)',
                      }}
                    >
                      {formatRelativeTime(item.when)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Top Performing Courses ──────────────────────────────────── */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h4
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--admin-on-surface)',
            }}
          >
            Top Performing Courses
          </h4>
          <div className="flex gap-2">
            <button
              aria-label="Previous"
              disabled
              className="p-2 rounded transition-colors disabled:opacity-40"
              style={{
                border: '1px solid var(--admin-outline-variant)',
                background: 'var(--admin-surface)',
                cursor: 'not-allowed',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next"
              disabled
              className="p-2 rounded transition-colors disabled:opacity-40"
              style={{
                border: '1px solid var(--admin-outline-variant)',
                background: 'var(--admin-surface)',
                cursor: 'not-allowed',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {topCourses.length === 0 ? (
          <div className="admin-card p-10 text-center"
               style={{ color: 'var(--admin-on-surface-variant)', fontFamily: 'var(--font-hanken)' }}>
            No enrollment data yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topCourses.map(({ course, count }, idx) => {
              const pct = topCourseLeader > 0 ? Math.round((count / topCourseLeader) * 100) : 0
              return (
                <div key={course.id} className="admin-card p-6 flex flex-col">
                  <div
                    className="aspect-video mb-4 rounded overflow-hidden flex items-center justify-center"
                    style={{ background: 'var(--admin-surface-low)' }}
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
                        fontSize: '2.25rem',
                        color: 'var(--admin-outline-variant)',
                      }}>L</span>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h5
                      className="mb-1 leading-tight"
                      style={{
                        fontFamily: 'var(--font-eb-garamond)',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'var(--admin-on-surface)',
                      }}
                    >
                      {course.title}
                    </h5>
                    {course.subtitle && (
                      <p
                        className="mb-6"
                        style={{
                          fontFamily: 'var(--font-hanken)',
                          fontSize: '0.8125rem',
                          color: 'var(--admin-on-surface-variant)',
                          lineHeight: 1.5,
                        }}
                      >
                        {course.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                      <span style={{
                        fontFamily: 'var(--font-hanken)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}>
                        {count} {count === 1 ? 'Student' : 'Students'}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-hanken)',
                        fontSize: '0.75rem',
                        color: 'var(--admin-sage)',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}>
                        {idx === 0 ? 'Top course' : `${pct}% of leader`}
                      </span>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--admin-surface-high)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${pct}%`,
                          background: 'var(--admin-celadon)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
