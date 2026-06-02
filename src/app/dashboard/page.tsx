import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, LayoutDashboard, Settings, LogOut, ChevronRight, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'My Dashboard | Lumora Women',
}

type EnrolledCourse = {
  course_id: string
  courses: {
    id: string
    title: string
    subtitle: string | null
    thumbnail_url: string | null
    is_free: boolean
  }
  completedCount: number
  totalLessons: number
  firstLessonId: string | null
}

async function getEnrolledCourses(userId: string) {
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      course_id,
      enrolled_at,
      courses (id, title, subtitle, thumbnail_url, is_free)
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false })

  if (!enrollments) return []

  const results = await Promise.all(
    enrollments.map(async (e) => {
      const { data: modulesWithLessons } = await supabase
        .from('modules')
        .select('id, order_number, lessons(id, order_number)')
        .eq('course_id', e.course_id)
        .order('order_number')

      const sortedModules = (modulesWithLessons ?? []).sort((a, b) => a.order_number - b.order_number)
      const totalLessons = sortedModules.reduce(
        (sum, m) => sum + ((m.lessons as { id: string }[])?.length ?? 0), 0
      )

      const lessonIds = sortedModules.flatMap((m) =>
        ((m.lessons as { id: string }[]) ?? []).map((lesson) => lesson.id)
      )

      const { count: completedCount } = lessonIds.length > 0
        ? await supabase
            .from('lesson_progress')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true)
            .in('lesson_id', lessonIds)
        : { count: 0 }

      const firstModule = sortedModules[0]
      let firstLessonId: string | null = null
      if (firstModule) {
        const sortedLessons = [...((firstModule.lessons as { id: string; order_number: number }[]) ?? [])]
          .sort((a, b) => a.order_number - b.order_number)
        firstLessonId = sortedLessons[0]?.id ?? null
      }

      return {
        course_id: e.course_id,
        courses: e.courses as unknown as EnrolledCourse['courses'],
        completedCount: completedCount ?? 0,
        totalLessons: totalLessons ?? 0,
        firstLessonId,
      }
    })
  )

  return results
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/dashboard')

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const enrolledCourses = await getEnrolledCourses(user.id)
  const firstName = profile?.first_name ?? user.email?.split('@')[0] ?? 'there'

  return (
    <div className="dashboard-layout" style={{ background: 'var(--page-bg)' }}>

      {/* Sidebar */}
      <aside
        className="dashboard-sidebar"
        aria-label="Dashboard navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="Lumora Women — home"
          style={{
            display: 'block', padding: '0 1.5rem', marginBottom: '2.5rem',
            textDecoration: 'none',
          }}
        >
          <span
            className="gold-text"
            aria-hidden="true"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700 }}
          >
            Lumora Women
          </span>
        </Link>

        {/* Nav */}
        <nav aria-label="Dashboard sections" className="dashboard-sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
          <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" aria-hidden="true" />} label="Dashboard" active />
          <NavItem href="/courses" icon={<BookOpen className="w-4 h-4" aria-hidden="true" />} label="Browse Courses" mobileLabel="Browse" />
          <NavItem href="/dashboard/settings" icon={<Settings className="w-4 h-4" aria-hidden="true" />} label="Settings" />
        </nav>

        {/* Sign out */}
        <div className="dashboard-sidebar-footer" style={{ padding: '0 0.75rem', marginTop: 'auto' }}>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                color: 'rgba(200,220,192,0.75)',
                transition: 'background 0.15s',
                minHeight: '44px',
              }}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign Out
            </button>
          </form>

          {/* User info */}
          <div style={{ borderTop: '1px solid rgba(200,220,192,0.1)', paddingTop: '1rem', marginTop: '0.75rem', padding: '1rem 0.875rem 0' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.125rem' }}>
              {profile?.first_name} {profile?.last_name}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(200,220,192,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {profile?.email ?? user.email}
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="dashboard-main">

        {/* Welcome */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
            Welcome back, {firstName}.
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            Pick up where you left off.
          </p>
        </div>

        {/* Enrolled courses */}
        <section aria-label="My enrolled courses">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              My Courses
            </h2>
            <Link
              href="/courses"
              className="gold-text"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
            >
              Browse more →
            </Link>
          </div>

          {enrolledCourses.length === 0 ? (
            <EmptyEnrollments />
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0, margin: 0 }}>
              {enrolledCourses.map((item) => (
                <li key={item.course_id}>
                  <CourseProgressCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

    </div>
  )
}

function NavItem({
  href, icon, label, active, mobileLabel,
}: {
  href: string; icon: React.ReactNode; label: string; active?: boolean; mobileLabel?: string
}) {
  return (
    <Link
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
        transition: 'background 0.15s',
        minHeight: '44px',
      }}
    >
      {icon}
      <span className="dashboard-nav-label-full">{label}</span>
      <span className="dashboard-nav-label-mobile">{mobileLabel ?? label}</span>
    </Link>
  )
}

function CourseProgressCard({ item }: { item: EnrolledCourse }) {
  const course = item.courses
  const pct = item.totalLessons > 0 ? Math.round((item.completedCount / item.totalLessons) * 100) : 0
  const href = item.firstLessonId ? `/lesson/${item.firstLessonId}` : `/lesson/course/${course.id}`
  const hasLessons = item.totalLessons > 0

  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: '1rem',
        border: '1px solid rgba(200,220,192,0.35)',
        overflow: 'hidden',
      }}
    >
      {/* Gold top line */}
      <div aria-hidden="true" style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1.25rem' }}>
        {/* Thumbnail */}
        <div
          style={{
            width: '6rem', aspectRatio: '16/9', borderRadius: '0.5rem',
            background: 'var(--pale-botanical)', overflow: 'hidden', flexShrink: 0,
          }}
        >
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt={`${course.title} thumbnail`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--botanical-green)', opacity: 0.5 }}>L</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {course.title}
          </h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {item.completedCount} / {item.totalLessons} lessons complete
          </p>

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${course.title} progress: ${pct}%`}
            style={{ height: '6px', borderRadius: '999px', background: 'var(--section-tint)', overflow: 'hidden' }}
          >
            <div
              aria-hidden="true"
              style={{
                height: '100%', borderRadius: '999px',
                background: pct === 100
                  ? 'var(--botanical-green)'
                  : 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                width: `${pct}%`, transition: 'width 0.5s',
              }}
            />
          </div>
        </div>

        {/* Continue button */}
        <Link
          href={href}
          aria-label={!hasLessons ? `View ${course.title}` : pct === 100 ? `Review ${course.title}` : pct === 0 ? `Start ${course.title}` : `Continue ${course.title}`}
          className="gold-text"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
            textDecoration: 'none',
            minHeight: '44px',
          }}
        >
          {!hasLessons ? (
            <>View <ChevronRight className="w-4 h-4" style={{ color: 'var(--gold-dark)' }} aria-hidden="true" /></>
          ) : pct === 100 ? (
            <>Review <ChevronRight className="w-4 h-4" style={{ color: 'var(--gold-dark)' }} aria-hidden="true" /></>
          ) : pct === 0 ? (
            <><Play className="w-4 h-4" style={{ color: 'var(--gold-dark)' }} aria-hidden="true" /> Start</>
          ) : (
            <>Continue <ChevronRight className="w-4 h-4" style={{ color: 'var(--gold-dark)' }} aria-hidden="true" /></>
          )}
        </Link>
      </div>
    </div>
  )
}

function EmptyEnrollments() {
  return (
    <div
      style={{
        background: '#FFFFFF', borderRadius: '1rem',
        border: '1px solid rgba(200,220,192,0.35)',
        padding: '3rem 2rem', textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '4rem', height: '4rem', borderRadius: '50%',
          background: 'var(--section-tint)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}
      >
        <BookOpen className="w-7 h-7" style={{ color: 'var(--botanical-green)' }} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        No courses yet
      </h3>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Start your wellness journey — browse courses and enroll in one today.
      </p>
      <Link href="/courses" className="btn-primary" style={{ borderRadius: '0.5rem', padding: '0.75rem 2rem' }}>
        Browse Courses
      </Link>
    </div>
  )
}
