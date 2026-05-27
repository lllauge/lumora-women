'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Course = {
  id: string
  title: string
  subtitle: string | null
  price: number
  is_free: boolean
  thumbnail_url: string | null
}

type Filter = 'all' | 'free' | 'paid'

export default function CoursesContent() {
  const [courses, setCourses] = useState<Course[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('courses')
      .select('id, title, subtitle, price, is_free, thumbnail_url')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCourses(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = courses.filter((c) => {
    if (filter === 'free') return c.is_free
    if (filter === 'paid') return !c.is_free
    return true
  })

  const tabs: { key: Filter; label: string; panelId: string; tabId: string }[] = [
    { key: 'all',  label: 'All Courses', panelId: 'courses-panel-all',  tabId: 'courses-tab-all' },
    { key: 'free', label: 'Free',        panelId: 'courses-panel-free', tabId: 'courses-tab-free' },
    { key: 'paid', label: 'Paid',        panelId: 'courses-panel-paid', tabId: 'courses-tab-paid' },
  ]

  const activeTab = tabs.find((t) => t.key === filter)!

  return (
    <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ background: '#162814', padding: '5rem 1.5rem 4rem' }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              color: 'var(--botanical-light)', display: 'block', marginBottom: '1rem',
            }}
          >
            Learn at your own pace
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
              color: '#FFFFFF', lineHeight: 1.15, marginBottom: '1.25rem',
            }}
          >
            All Courses
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '1.0625rem',
              color: 'rgba(200,220,192,0.8)', lineHeight: 1.7,
            }}
          >
            Expert-led courses on postpartum recovery, pelvic health, nutrition, and more — created for women, by women who get it.
          </p>
        </div>
      </section>

      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Filter courses"
        style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(200,220,192,0.35)', position: 'sticky', top: 0, zIndex: 10 }}
      >
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1.5rem', display: 'flex', gap: '0.25rem' }}>
          {tabs.map(({ key, label, tabId, panelId }) => (
            <button
              key={key}
              id={tabId}
              role="tab"
              aria-selected={filter === key}
              aria-controls={panelId}
              onClick={() => setFilter(key)}
              style={{
                padding: '1rem 1.5rem',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: filter === key ? 'var(--botanical-green)' : 'var(--text-secondary)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: filter === key ? '2px solid var(--botanical-green)' : '2px solid transparent',
                cursor: 'pointer',
                background: 'none',
                transition: 'color 0.15s',
                minHeight: '44px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <section
        id={activeTab.panelId}
        role="tabpanel"
        aria-labelledby={activeTab.tabId}
        style={{ maxWidth: '72rem', margin: '0 auto', padding: '3.5rem 1.5rem' }}
      >
        <h2 className="sr-only">{activeTab.label}</h2>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} aria-hidden="true" style={{ borderRadius: '1rem', overflow: 'hidden', background: '#FFFFFF', border: '1px solid rgba(200,220,192,0.3)' }}>
                <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
                <div style={{ aspectRatio: '16/9', background: 'var(--section-tint)' }} />
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ height: '1rem', background: 'var(--section-tint)', borderRadius: '0.25rem', marginBottom: '0.75rem' }} />
                  <div style={{ height: '0.75rem', background: 'var(--pale-botanical)', borderRadius: '0.25rem', width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              No courses here yet
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
              Check back soon — new content is on the way.
            </p>
          </div>
        ) : (
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem', listStyle: 'none', padding: 0, margin: 0 }}>
            {filtered.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Email capture */}
      <section style={{ background: 'var(--section-sand)', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              color: 'var(--botanical-green)', display: 'block', marginBottom: '1rem',
            }}
          >
            Stay in the loop
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            New Courses Coming Soon
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
              color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem',
            }}
          >
            Be the first to know when new courses drop — plus get early access and member-only discounts.
          </p>
          <form
            aria-label="Course notification sign-up"
            style={{ display: 'flex', gap: '0.75rem', maxWidth: '28rem', margin: '0 auto', flexWrap: 'wrap' as const }}
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="courses-notify-email" className="sr-only">Email address</label>
            <input
              id="courses-notify-email"
              type="email"
              placeholder="your@email.com"
              aria-required="true"
              style={{
                flex: 1, minWidth: 0, padding: '0.75rem 1rem', borderRadius: '0.5rem',
                border: '1.5px solid rgba(200,220,192,0.45)', fontFamily: 'var(--font-sans)',
                fontSize: '1rem', color: 'var(--text-primary)', background: '#FFFFFF',
                minHeight: '44px',
              }}
            />
            <button type="submit" className="btn-primary" style={{ borderRadius: '0.5rem', padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' as const, minHeight: '44px' }}>
              Notify Me
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

function CourseCard({ course }: { course: Course }) {
  const href = course.is_free ? `/free-course/${course.id}` : `/courses/${course.id}`
  const priceLabel = course.is_free ? 'Free' : `$${(course.price / 100).toFixed(0)}`

  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>
      <article
        aria-label={`${course.title} — ${priceLabel}`}
        style={{
          borderRadius: '1rem', overflow: 'hidden', background: '#FFFFFF',
          border: '1px solid rgba(200,220,192,0.3)',
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.boxShadow = '0 8px 32px -8px rgba(26,40,24,0.18)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.boxShadow = 'none'
          el.style.transform = 'none'
        }}
      >
        {/* Gold top line */}
        <div aria-hidden="true" style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />

        {/* Thumbnail */}
        <div style={{ aspectRatio: '16/9', background: 'var(--pale-botanical)', position: 'relative', overflow: 'hidden' }}>
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={`${course.title} course thumbnail`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--botanical-green)', opacity: 0.3 }}>L</span>
            </div>
          )}
          {course.is_free && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', top: '0.75rem', left: '0.75rem',
                background: 'var(--botanical-green)', color: '#FFFFFF',
                fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                padding: '0.25rem 0.625rem', borderRadius: '999px',
              }}
            >
              Free
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '0.5rem' }}>
            {course.title}
          </h3>
          {course.subtitle && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.875rem' }}>
              {course.subtitle}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
                background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              aria-hidden="true"
            >
              {priceLabel}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--botanical-green)', fontWeight: 600 }}>
              Enroll →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
