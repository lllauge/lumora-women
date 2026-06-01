import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ChevronLeft, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ courseId: string }>
}

export default async function CourseLearningPage({ params }: PageProps) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/lesson/course/${courseId}`)

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    if (!enrollment) redirect(`/courses/${courseId}`)
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description')
    .eq('id', courseId)
    .maybeSingle()

  if (!course) redirect('/dashboard')

  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_number, lessons(id, title, order_number)')
    .eq('course_id', courseId)
    .order('order_number')

  const sortedModules = [...(modules ?? [])].sort((a, b) => a.order_number - b.order_number)
  const firstLesson = sortedModules
    .flatMap((module) =>
      [...((module.lessons as { id: string; order_number: number }[]) ?? [])]
        .sort((a, b) => a.order_number - b.order_number)
    )[0]

  if (firstLesson) redirect(`/lesson/${firstLesson.id}`)

  return (
    <div className="lesson-layout">
      <aside aria-label="Course curriculum" className="lesson-sidebar">
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(200,220,192,0.1)' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              color: 'rgba(200,220,192,0.8)',
              minHeight: '44px',
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to dashboard
          </Link>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}>
            {course.title}
          </h2>
        </div>

        <nav aria-label="Lesson list" style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
          <div style={{ padding: '0.75rem 1rem' }}>
            <div
              style={{
                borderLeft: '2px solid #C8980A',
                background: 'rgba(255,255,255,0.1)',
                padding: '0.75rem',
              }}
            >
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#FFFFFF', lineHeight: 1.4 }}>
                Course access is active.
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(200,220,192,0.75)', lineHeight: 1.5, marginTop: '0.35rem' }}>
                Lessons will appear here when they are added.
              </p>
            </div>
          </div>
        </nav>
      </aside>

      <main id="main-content" className="lesson-main">
        <div style={{ padding: '2rem 2.5rem', flex: 1 }}>
          <div style={{ maxWidth: '46rem' }}>
            <p
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--botanical-green)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '1rem',
              }}
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              Course Access
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '1rem' }}>
              {course.title}
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem' }}>
              {course.description || 'You are enrolled in this course. Lesson content has not been added yet.'}
            </p>

            <div
              role="status"
              style={{
                border: '1px solid rgba(200,220,192,0.35)',
                borderRadius: '1rem',
                background: '#FFFFFF',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  background: 'var(--section-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock className="w-5 h-5" style={{ color: 'var(--botanical-green)' }} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Lessons are not available yet.
                </h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Your access is saved. Once lessons are added, they will appear in this course area automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
