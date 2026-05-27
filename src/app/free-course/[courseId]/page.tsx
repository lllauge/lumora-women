'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle } from 'lucide-react'

type Course = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  thumbnail_url: string | null
}

export default function FreeCourseCapturePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [form, setForm] = useState({ firstName: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('courses')
      .select('id, title, subtitle, description, thumbnail_url')
      .eq('id', courseId)
      .single()
      .then(({ data }) => setCourse(data))
  }, [courseId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.email.includes('@')) {
      setError('Please enter your first name and a valid email.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Save to email_subscribers
    await supabase.from('email_subscribers').upsert(
      { email: form.email.toLowerCase(), first_name: form.firstName },
      { onConflict: 'email' }
    )

    // Check if user already exists; if not, create one
    let userId: string | undefined

    const { data: existingUser } = await supabase.auth.getUser()
    if (existingUser.user) {
      userId = existingUser.user.id
    } else {
      // Sign up with a generated password — they can reset it later
      const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!'
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.toLowerCase(),
        password: tempPassword,
        options: { data: { first_name: form.firstName } },
      })
      if (signUpError && !signUpError.message.includes('already registered')) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      userId = signUpData?.user?.id
    }

    if (userId) {
      await supabase.from('enrollments').upsert(
        { user_id: userId, course_id: courseId },
        { onConflict: 'user_id,course_id' }
      )
    }

    router.push('/free-course/confirmation')
  }

  const includes = [
    'Immediate access — no waiting',
    'All lessons, notes, and resources included',
    'Self-paced — go at your own speed',
  ]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--warm-white)' }}
    >
      {/* Minimal header — logo only */}
      <header className="px-6 py-5">
        <Link href="/">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--sage-green-dark)' }}>
            Lumora Women
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — course info */}
          <div>
            {/* Thumbnail */}
            <div
              className="rounded-2xl aspect-video mb-6 flex items-center justify-center overflow-hidden"
              style={{ background: 'var(--sage-green-light)' }}
            >
              {course?.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--sage-green-dark)', opacity: 0.3 }}>L</span>
              )}
            </div>

            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ background: 'var(--rose-blush)', color: 'var(--warm-terracotta-deep)', fontFamily: 'var(--font-sans)' }}
            >
              Free Course
            </span>

            <h1
              className="mb-3"
              style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--deep-earth)', lineHeight: 1.2 }}
            >
              {course?.title ?? 'Loading…'}
            </h1>
            {course?.subtitle && (
              <p
                className="mb-6"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}
              >
                {course.subtitle}
              </p>
            )}

            {/* Bullet points */}
            <ul className="space-y-3">
              {includes.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--sage-green-deep)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--on-surface-variant)' }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — form */}
          <div
            className="rounded-2xl p-8"
            style={{ background: '#FFFFFF', border: '1px solid var(--outline-variant)', boxShadow: '0 4px 24px -4px rgba(61,43,36,0.10)' }}
          >
            <h2
              className="mb-2"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--deep-earth)' }}
            >
              Get Free Access
            </h2>
            <p
              className="mb-6"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}
            >
              Enter your name and email to get instant access.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--deep-earth)', display: 'block', marginBottom: '0.375rem' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jane"
                  required
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--outline-variant)', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--deep-earth)', outline: 'none', background: '#FFF' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--deep-earth)', display: 'block', marginBottom: '0.375rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  required
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--outline-variant)', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--deep-earth)', outline: 'none', background: '#FFF' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: '#B91C1C' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
                style={{ borderRadius: '0.5rem', padding: '0.9rem', marginTop: '0.5rem' }}
              >
                {loading ? 'Getting your access…' : 'Get Instant Access →'}
              </button>
            </form>

            <p
              className="text-center mt-4"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}
            >
              Your information is safe. No spam, ever.{' '}
              <Link href="/privacy-policy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
