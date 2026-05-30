'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Mail } from 'lucide-react'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ''

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
  const captchaRef = useRef<HCaptcha>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [courseLoading, setCourseLoading] = useState(true)
  const [form, setForm] = useState({ firstName: '', email: '', password: '', confirm: '' })
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null)
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('courses')
      .select('id, title, subtitle, description, thumbnail_url')
      .eq('id', courseId)
      .single()
      .then(({ data }) => {
        setCourse(data)
        setCourseLoading(false)
      })

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setLoggedInUserId(data.user.id)
        setLoggedInEmail(data.user.email ?? null)
      }
    })
  }, [courseId])

  async function handleEnrollLoggedIn() {
    if (!loggedInUserId) return
    setEnrolling(true)
    const res = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    })
    if (res.ok) {
      router.push(`/courses/${courseId}`)
    } else {
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data.error?.toLowerCase().includes('confirm')) {
        setShowEmailModal(true)
      } else {
        setError(data.error ?? 'Enrollment failed. Please try again.')
      }
      setEnrolling(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.firstName.trim() || !form.email.includes('@')) {
      setError('Please enter your first name and a valid email address.')
      return
    }

    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Password must be at least 8 characters and include one uppercase letter and one number.')
      return
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    if (!ageConfirmed) {
      setError('You must confirm you are 18 years of age or older to access this course.')
      return
    }

    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError('Please complete the CAPTCHA.')
      return
    }

    setLoading(true)
    setError('')
    setAlreadyRegistered(false)

    // Sign up the user with their chosen password. They can enroll after confirming email.
    const supabase = createClient()
    const { data: existingSession } = await supabase.auth.getUser()

    if (existingSession.user) {
      await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      router.push('/free-course/confirmation')
      return
    } else {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          email: form.email,
          password: form.password,
          captchaToken,
        }),
      })

      const result = await response.json().catch(() => ({} as { error?: string }))
      if (!response.ok) {
        const message = result.error ?? 'Account creation failed. Please try again.'
        if (message.toLowerCase().includes('already')) {
          setAlreadyRegistered(true)
        } else {
          setError(message)
        }
        captchaRef.current?.resetCaptcha()
        setCaptchaToken(null)
        setLoading(false)
        return
      }
    }

    router.push('/verify-email')
  }

  const includes = [
    'Immediate access — no waiting',
    'All lessons, notes, and resources included',
    'Self-paced — go at your own speed',
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--warm-white)' }}>
      <header className="px-6 py-5">
        <Link href="/">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--sage-green-dark)' }}>
            Lumora Women
          </span>
        </Link>
      </header>

      <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-12">
        {!courseLoading && !course ? (
          <div className="w-full max-w-xl text-center rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid var(--outline-variant)', boxShadow: '0 4px 24px -4px rgba(61,43,36,0.10)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--deep-earth)', lineHeight: 1.2, marginBottom: '0.85rem' }}>
              This free course is not available
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--on-surface-variant)', lineHeight: 1.7, marginBottom: '1.75rem' }}>
              It may have moved, been unpublished, or the link may be incomplete.
            </p>
            <Link href="/courses" className="btn-primary" style={{ borderRadius: '999px', padding: '0.85rem 1.5rem' }}>
              Browse Courses
            </Link>
          </div>
        ) : (
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left — course info */}
          <div>
            <div className="rounded-2xl aspect-video mb-6 flex items-center justify-center overflow-hidden" style={{ background: 'var(--sage-green-light)' }}>
              {course?.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--sage-green-dark)', opacity: 0.3 }}>L</span>
              )}
            </div>

            <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
                  style={{ background: 'var(--rose-blush)', color: 'var(--warm-terracotta-deep)', fontFamily: 'var(--font-sans)' }}>
              Free Course
            </span>

            <h1 className="mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--deep-earth)', lineHeight: 1.2 }}>
              {course?.title ?? 'Loading…'}
            </h1>
            {course?.subtitle && (
              <p className="mb-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                {course.subtitle}
              </p>
            )}

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
          <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid var(--outline-variant)', boxShadow: '0 4px 24px -4px rgba(61,43,36,0.10)' }}>
            {loggedInUserId ? (
              /* Already logged in — just enroll */
              <>
                <h2 className="mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--deep-earth)' }}>
                  You&apos;re already signed in
                </h2>
                <p className="mb-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
                  Logged in as
                </p>
                <p className="mb-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--deep-earth)' }}>
                  {loggedInEmail}
                </p>
                <button
                  onClick={handleEnrollLoggedIn}
                  disabled={enrolling}
                  className="btn-primary w-full"
                  style={{ borderRadius: '0.5rem', padding: '0.9rem', minHeight: '44px' }}
                >
                  {enrolling ? 'Enrolling…' : 'Get Instant Access →'}
                </button>
              </>
            ) : (
              /* Not logged in — show sign-up form */
              <>
                <h2 className="mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--deep-earth)' }}>
                  Get Free Access
                </h2>
                <p className="mb-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
                  Create your free account to access this course.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="fc-first-name" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--deep-earth)', display: 'block', marginBottom: '0.375rem' }}>
                      First Name <span aria-hidden="true" style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      id="fc-first-name"
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="Jane"
                      required
                      aria-required="true"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--outline-variant)', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--deep-earth)', background: '#FFF', boxSizing: 'border-box' as const, minHeight: '44px' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
                    />
                  </div>
                  <div>
                    <label htmlFor="fc-email" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--deep-earth)', display: 'block', marginBottom: '0.375rem' }}>
                      Email Address <span aria-hidden="true" style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      id="fc-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="jane@example.com"
                      required
                      aria-required="true"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--outline-variant)', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--deep-earth)', background: '#FFF', boxSizing: 'border-box' as const, minHeight: '44px' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
                    />
                  </div>
                  <div>
                    <label htmlFor="fc-password" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--deep-earth)', display: 'block', marginBottom: '0.375rem' }}>
                      Password <span aria-hidden="true" style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      id="fc-password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--outline-variant)', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--deep-earth)', background: '#FFF', boxSizing: 'border-box' as const, minHeight: '44px' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
                    />
                  </div>
                  <div>
                    <label htmlFor="fc-confirm-password" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--deep-earth)', display: 'block', marginBottom: '0.375rem' }}>
                      Confirm Password <span aria-hidden="true" style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      id="fc-confirm-password"
                      type="password"
                      value={form.confirm}
                      onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                      placeholder="Repeat your password"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1.5px solid var(--outline-variant)', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--deep-earth)', background: '#FFF', boxSizing: 'border-box' as const, minHeight: '44px' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
                    />
                  </div>

                  {/* Age confirmation */}
                  <div>
                    <label
                      htmlFor="fc-age-confirm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.95rem',
                        color: 'var(--deep-earth)',
                        lineHeight: 1.45,
                        padding: '0.9rem 1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(200,220,192,0.45)',
                        background: ageConfirmed ? 'var(--pale-botanical)' : 'var(--warm-white)',
                      }}
                    >
                      <input
                        id="fc-age-confirm"
                        type="checkbox"
                        checked={ageConfirmed}
                        onChange={(e) => setAgeConfirmed(e.target.checked)}
                        aria-required="true"
                        style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, accentColor: 'var(--botanical-green)', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        I confirm I am <strong style={{ fontWeight: 800 }}>18 years of age or older</strong>
                      </span>
                    </label>
                  </div>

                  {/* hCaptcha */}
                  {HCAPTCHA_SITE_KEY && (
                    <HCaptcha
                      ref={captchaRef}
                      sitekey={HCAPTCHA_SITE_KEY}
                      onVerify={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                    />
                  )}

                  {alreadyRegistered && (
                    <div role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#92400E', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '0.5rem', padding: '0.75rem 1rem', lineHeight: 1.5 }}>
                      It looks like you already have an account.{' '}
                      <Link href={`/login?redirectTo=/free-course/${courseId}`} style={{ fontWeight: 600, textDecoration: 'underline', color: '#92400E' }}>
                        Log in here
                      </Link>{' '}
                      to get access to this course.
                    </div>
                  )}

                  {error && (
                    <p role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: '#B91C1C' }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                    style={{ borderRadius: '0.5rem', padding: '0.9rem', marginTop: '0.5rem', minHeight: '44px' }}
                  >
                    {loading ? 'Getting your access…' : 'Get Instant Access →'}
                  </button>
                </form>

                <p className="text-center mt-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                  Already have an account?{' '}
                  <Link href={`/login?redirectTo=/free-course/${courseId}`} style={{ color: 'var(--warm-terracotta)', fontWeight: 600, textDecoration: 'none' }}>
                    Log in
                  </Link>
                </p>

                <p className="text-center mt-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                  Your information is safe. No spam, ever.{' '}
                  <Link href="/privacy-policy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.
                </p>
              </>
            )}
          </div>
        </div>
        )}
      </main>

      {/* Email confirmation required modal */}
      {showEmailModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-modal-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmailModal(false) }}
        >
          <div style={{
            background: '#FFFFFF', borderRadius: '1rem', padding: '2.5rem 2rem',
            maxWidth: '26rem', width: '100%',
            boxShadow: '0 20px 60px rgba(61,43,36,0.22)',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '4rem', height: '4rem', borderRadius: '50%',
              background: 'var(--rose-blush)', marginBottom: '1.25rem',
            }}>
              <Mail className="w-7 h-7" style={{ color: 'var(--warm-terracotta-deep)' }} aria-hidden="true" />
            </div>

            <h2
              id="email-modal-title"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--deep-earth)', marginBottom: '0.75rem' }}
            >
              Confirm your email first
            </h2>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              We sent a confirmation link to{' '}
              <strong style={{ color: 'var(--deep-earth)' }}>{loggedInEmail}</strong>.
              {' '}Click that link in your inbox, then come back here to get instant access to your course.
            </p>

            <button
              onClick={() => setShowEmailModal(false)}
              className="btn-primary w-full"
              style={{ borderRadius: '0.5rem', padding: '0.9rem', minHeight: '44px' }}
            >
              Got it — I&apos;ll check my email
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
