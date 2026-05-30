'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ChevronDown, ChevronUp, Play, Lock } from 'lucide-react'

type Lesson = {
  id: string
  title: string
  order_number: number
}

type Module = {
  id: string
  title: string
  order_number: number
  lessons: Lesson[]
}

type Course = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  price: number
  is_free: boolean
  thumbnail_url: string | null
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--botanical-light)' }}>{label}</div>
    </div>
  )
}

export default function CourseDetailContent({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    Promise.all([
      supabase
        .from('courses')
        .select('id, title, subtitle, description, price, is_free, thumbnail_url')
        .eq('id', courseId)
        .single(),
      supabase
        .from('modules')
        .select('id, title, order_number, lessons(id, title, order_number)')
        .eq('course_id', courseId)
        .order('order_number'),
      supabase.auth.getUser(),
    ]).then(async ([courseRes, modulesRes, userRes]) => {
      setCourse(courseRes.data)

      const mods = (modulesRes.data ?? []).map((m: Module & { lessons: Lesson[] }) => ({
        ...m,
        lessons: [...(m.lessons ?? [])].sort((a, b) => a.order_number - b.order_number),
      }))
      setModules(mods)
      if (mods.length > 0) setOpenModules(new Set([mods[0].id]))

      if (userRes.data.user) {
        const userId = userRes.data.user.id
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single()
        if (profile?.role === 'admin') {
          setEnrolled(true)
        } else {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .maybeSingle()
          setEnrolled(!!enrollment)
        }
      }

      setLoading(false)
    })
  }, [courseId])

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }


  const firstLesson = modules[0]?.lessons[0]
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)

  if (!loading && !course) {
    return (
      <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '70vh', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '42rem', margin: '0 auto', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '1rem',
            }}
          >
            This course is not available
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              marginBottom: '2rem',
            }}
          >
            It may have moved, been unpublished, or the link may be incomplete.
          </p>
          <Link href="/courses" className="btn-primary" style={{ borderRadius: '999px', padding: '0.85rem 1.5rem' }}>
            Browse Courses
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>

      {/* Hero banner */}
      <div style={{ background: '#162814', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <Link
            href="/courses"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--botanical-light)', textDecoration: 'none', marginBottom: '1.5rem', display: 'inline-block' }}
          >
            ← All Courses
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
            <div>
              {course?.is_free && (
                <span
                  style={{
                    display: 'inline-block', marginBottom: '1rem',
                    background: 'var(--botanical-green)', color: '#FFFFFF',
                    fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    padding: '0.25rem 0.75rem', borderRadius: '999px',
                  }}
                >
                  Free Course
                </span>
              )}
              <h1
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                  color: '#FFFFFF', lineHeight: 1.2, marginBottom: '0.875rem',
                }}
              >
                {loading ? 'Loading…' : course?.title}
              </h1>
              {course?.subtitle && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.0625rem', color: 'rgba(200,220,192,0.8)', lineHeight: 1.6, maxWidth: '44rem' }}>
                  {course.subtitle}
                </p>
              )}
              {!loading && (
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' as const }}>
                  <Stat label="Lessons" value={totalLessons.toString()} />
                  <Stat label="Self-paced" value="Go at your speed" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="course-detail-grid" style={{ maxWidth: '72rem', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Left column */}
        <div>
          {course?.description && (
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                About This Course
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {course.description}
              </p>
            </section>
          )}

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Course Curriculum
            </h2>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: '3.5rem', background: 'var(--section-tint)', borderRadius: '0.75rem', marginBottom: '0.75rem' }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {modules.map((mod) => {
                  const isOpen = openModules.has(mod.id)
                  return (
                    <div
                      key={mod.id}
                      style={{
                        borderRadius: '0.75rem', overflow: 'hidden',
                        border: '1px solid rgba(200,220,192,0.35)',
                        background: '#FFFFFF',
                      }}
                    >
                      <button
                        onClick={() => toggleModule(mod.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left' as const,
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {mod.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                          </span>
                          {isOpen
                            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          }
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid rgba(200,220,192,0.35)' }}>
                          {mod.lessons.map((lesson, idx) => (
                            <div
                              key={lesson.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.875rem',
                                padding: '0.875rem 1.25rem',
                                borderBottom: idx < mod.lessons.length - 1 ? '1px solid var(--section-tint)' : 'none',
                              }}
                            >
                              {enrolled
                                ? <Play className="w-4 h-4 shrink-0" style={{ color: 'var(--botanical-green)' }} />
                                : <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                              }
                              <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                {lesson.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column — sticky purchase card */}
        <div className="course-detail-sidebar">
          <div
            style={{
              background: '#FFFFFF', borderRadius: '1.25rem',
              border: '1px solid rgba(200,220,192,0.35)',
              boxShadow: '0 4px 24px -4px rgba(26,40,24,0.12)',
              overflow: 'hidden',
            }}
          >
            {/* Gold top line */}
            <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />

            <div style={{ aspectRatio: '16/9', background: 'var(--pale-botanical)', overflow: 'hidden' }}>
              {course?.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--botanical-green)', opacity: 0.3 }}>L</span>
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700,
                    background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {course?.is_free ? 'Free' : `$${course ? (course.price / 100).toFixed(0) : '—'}`}
                </span>
              </div>

              {enrolled ? (
                <Link
                  href={firstLesson ? `/lesson/${firstLesson.id}` : '/dashboard'}
                  className="btn-primary"
                  style={{ display: 'block', textAlign: 'center', borderRadius: '0.5rem', padding: '0.9rem', marginBottom: '0.75rem' }}
                >
                  Continue Learning →
                </Link>
              ) : course?.is_free ? (
                <Link
                  href={`/free-course/${courseId}`}
                  className="btn-primary"
                  style={{ display: 'block', textAlign: 'center', borderRadius: '0.5rem', padding: '0.9rem', marginBottom: '0.75rem' }}
                >
                  Get Free Access →
                </Link>
              ) : (
                <Link
                  href={`/checkout?courseId=${courseId}`}
                  className="btn-primary"
                  style={{ display: 'block', textAlign: 'center', borderRadius: '0.5rem', padding: '0.9rem', marginBottom: '0.75rem' }}
                >
                  Enroll Now →
                </Link>
              )}

              <ul style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['Lifetime access', 'Self-paced lessons', 'Downloadable resources', 'Community support'].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--botanical-green)' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .course-detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: start;
        }
        @media (min-width: 1024px) {
          .course-detail-grid {
            grid-template-columns: 1fr minmax(0, 320px);
            gap: 3rem;
          }
        }
        .course-detail-sidebar {
          position: static;
        }
        @media (min-width: 1024px) {
          .course-detail-sidebar {
            position: sticky;
            top: 5rem;
          }
        }
      `}</style>
    </main>
  )
}
