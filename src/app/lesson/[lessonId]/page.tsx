'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ChevronLeft, ChevronRight, Download, BookOpen, Info, Play } from 'lucide-react'

type Download = {
  id: string
  title: string
  file_url: string
}

type LessonData = {
  id: string
  title: string
  description: string | null
  video_url: string | null
  notes: string | null
  sort_order: number
  is_preview: boolean
  module_id: string
  modules: {
    id: string
    title: string
    course_id: string
    courses: {
      id: string
      title: string
    }
  }
}

type SidebarLesson = {
  id: string
  title: string
  sort_order: number
  duration_minutes: number | null
  completed: boolean
}

type SidebarModule = {
  id: string
  title: string
  sort_order: number
  lessons: SidebarLesson[]
}

const GOLD = 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)'

export default function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = use(params)
  const router = useRouter()

  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [sidebarModules, setSidebarModules] = useState<SidebarModule[]>([])
  const [downloads, setDownloads] = useState<Download[]>([])
  const [completed, setCompleted] = useState(false)
  const [marking, setMarking] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'downloads' | 'about'>('notes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/login?redirectTo=/lesson/${lessonId}`)
        return
      }

      const { data: lessonData } = await supabase
        .from('lessons')
        .select(`
          id, title, description, video_url, notes, sort_order, is_preview, module_id,
          modules (id, title, course_id, courses (id, title))
        `)
        .eq('id', lessonId)
        .single()

      if (!lessonData) {
        router.push('/dashboard')
        return
      }

      setLesson(lessonData as unknown as LessonData)

      const courseId = (lessonData.modules as unknown as LessonData['modules']).course_id

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle()

      if (!enrollment && !lessonData.is_preview) {
        router.push(`/courses/${courseId}`)
        return
      }

      const { data: modulesData } = await supabase
        .from('modules')
        .select('id, title, sort_order, lessons(id, title, sort_order, duration_minutes)')
        .eq('course_id', courseId)
        .order('sort_order')

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)

      const progressMap = new Map(progressData?.map((p) => [p.lesson_id, p.completed]) ?? [])

      const mods: SidebarModule[] = (modulesData ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        sort_order: m.sort_order,
        lessons: [...((m.lessons as SidebarLesson[]) ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((l) => ({
          ...l,
          completed: progressMap.get(l.id) ?? false,
        })),
      }))
      setSidebarModules(mods)

      setCompleted(progressMap.get(lessonId) ?? false)

      const { data: downloadsData } = await supabase
        .from('downloads')
        .select('id, title, file_url')
        .eq('lesson_id', lessonId)
      setDownloads(downloadsData ?? [])

      setLoading(false)
    }

    load()
  }, [lessonId, router])

  async function markComplete() {
    if (!lesson) return
    setMarking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('lesson_progress').upsert(
      { user_id: user.id, lesson_id: lessonId, completed: !completed },
      { onConflict: 'user_id,lesson_id' }
    )
    setCompleted((v) => !v)
    setMarking(false)
  }

  function flatLessons() {
    return sidebarModules.flatMap((m) => m.lessons)
  }

  const allLessons = flatLessons()
  const currentIdx = allLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null

  const courseId = lesson ? (lesson.modules as LessonData['modules']).course_id : null
  const courseTitle = lesson ? (lesson.modules as LessonData['modules']).courses.title : null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>

      {/* Sidebar */}
      <aside
        style={{
          width: '280px', flexShrink: 0,
          background: '#162814',
          display: 'flex', flexDirection: 'column',
          height: '100vh', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(200,220,192,0.1)' }}>
          <Link
            href={courseId ? `/courses/${courseId}` : '/dashboard'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              textDecoration: 'none', marginBottom: '0.75rem',
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              color: 'rgba(200,220,192,0.6)',
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to course
          </Link>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}>
            {loading ? '…' : courseTitle}
          </h2>
        </div>

        {/* Curriculum */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
          {sidebarModules.map((mod) => (
            <div key={mod.id} style={{ marginBottom: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(200,220,192,0.45)', padding: '0.5rem 1rem 0.25rem' }}>
                {mod.title}
              </p>
              {mod.lessons.map((l) => {
                const isActive = l.id === lessonId
                return (
                  <Link
                    key={l.id}
                    href={`/lesson/${l.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.5rem 1rem',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'none',
                      textDecoration: 'none',
                      borderLeft: isActive ? '2px solid #C8980A' : '2px solid transparent',
                    }}
                  >
                    <div
                      style={{
                        width: '1.25rem', height: '1.25rem', borderRadius: '50%', flexShrink: 0,
                        background: l.completed ? 'var(--botanical-light)' : 'rgba(200,220,192,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {l.completed && <CheckCircle className="w-3 h-3" style={{ color: 'var(--dark-card-bg)' }} />}
                    </div>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: isActive ? '#FFFFFF' : 'rgba(200,220,192,0.65)', lineHeight: 1.3, flex: 1 }}>
                      {l.title}
                    </span>
                    {l.duration_minutes && (
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'rgba(200,220,192,0.4)', flexShrink: 0 }}>
                        {l.duration_minutes}m
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Video area */}
        <div style={{ background: '#000', aspectRatio: '16/9', maxHeight: '60vh', position: 'relative' }}>
          {loading ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
            </div>
          ) : lesson?.video_url ? (
            lesson.video_url.startsWith('stream:') ? (
              <iframe
                key={lesson.video_url}
                src={`https://iframe.videodelivery.net/${lesson.video_url.slice(7)}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            ) : (
              <video
                key={lesson.video_url}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                playsInline
              >
                <source src={lesson.video_url} />
              </video>
            )
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
              <Play className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '0.75rem' }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>Video coming soon</p>
            </div>
          )}
        </div>

        {/* Lesson content */}
        <div style={{ padding: '2rem 2.5rem', flex: 1 }}>

          {/* Title + complete button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' as const }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {loading ? '…' : lesson?.title}
            </h1>
            <button
              onClick={markComplete}
              disabled={marking}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', borderRadius: '999px',
                background: completed
                  ? 'var(--section-tint)'
                  : '#FFFFFF',
                border: `1.5px solid ${completed ? 'var(--botanical-green)' : 'rgba(200,220,192,0.45)'}`,
                cursor: 'pointer', flexShrink: 0,
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
                color: completed ? 'var(--botanical-green)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              <CheckCircle className="w-4 h-4" />
              {completed ? 'Completed' : 'Mark Complete'}
            </button>
          </div>

          {/* Progress bar */}
          {allLessons.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ height: '4px', borderRadius: '999px', background: 'var(--section-tint)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', borderRadius: '999px',
                    background: GOLD,
                    width: `${Math.round(((currentIdx + 1) / allLessons.length) * 100)}%`,
                    transition: 'width 0.5s',
                  }}
                />
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                Lesson {currentIdx + 1} of {allLessons.length}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid rgba(200,220,192,0.35)', display: 'flex', gap: '0.25rem', marginBottom: '1.75rem' }}>
            {([
              { key: 'notes', icon: <BookOpen className="w-4 h-4" />, label: 'Notes' },
              { key: 'downloads', icon: <Download className="w-4 h-4" />, label: `Downloads${downloads.length > 0 ? ` (${downloads.length})` : ''}` },
              { key: 'about', icon: <Info className="w-4 h-4" />, label: 'About' },
            ] as const).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.75rem 1rem',
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
                  color: activeTab === key ? 'var(--botanical-green)' : 'var(--text-secondary)',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: activeTab === key ? '2px solid var(--botanical-green)' : '2px solid transparent',
                  background: 'none', cursor: 'pointer',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'notes' && (
            <div style={{ maxWidth: '48rem' }}>
              {lesson?.notes ? (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  {lesson.notes}
                </p>
              ) : (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                  No notes for this lesson.
                </p>
              )}
            </div>
          )}

          {activeTab === 'downloads' && (
            <div style={{ maxWidth: '36rem' }}>
              {downloads.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                  No downloads for this lesson.
                </p>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {downloads.map((dl) => (
                    <li key={dl.id}>
                      <a
                        href={dl.file_url}
                        download
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.875rem 1rem', borderRadius: '0.75rem',
                          border: '1px solid rgba(200,220,192,0.35)', background: '#FFFFFF',
                          textDecoration: 'none',
                        }}
                      >
                        <Download className="w-4 h-4 shrink-0" style={{ color: 'var(--botanical-green)' }} />
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {dl.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div style={{ maxWidth: '48rem' }}>
              {lesson?.description ? (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  {lesson.description}
                </p>
              ) : (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                  No description available.
                </p>
              )}
            </div>
          )}

          {/* Prev / Next navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(200,220,192,0.35)' }}>
            {prevLesson ? (
              <Link
                href={`/lesson/${prevLesson.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--text-secondary)', textDecoration: 'none',
                }}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Link>
            ) : <div />}

            {nextLesson ? (
              <Link
                href={`/lesson/${nextLesson.id}`}
                className="gold-text"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Next <ChevronRight className="w-4 h-4" style={{ color: 'var(--gold-dark)' }} />
              </Link>
            ) : (
              <Link
                href="/dashboard"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--botanical-green)', textDecoration: 'none',
                }}
              >
                <CheckCircle className="w-4 h-4" /> Back to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
