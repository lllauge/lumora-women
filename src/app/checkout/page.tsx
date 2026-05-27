'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, CheckCircle } from 'lucide-react'

type Course = {
  id: string
  title: string
  subtitle: string | null
  price: number
  thumbnail_url: string | null
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseId = searchParams.get('courseId') ?? ''

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from('courses')
      .select('id, title, subtitle, price, thumbnail_url')
      .eq('id', courseId)
      .single()
      .then(({ data }) => {
        setCourse(data)
        setLoading(false)
      })
  }, [courseId])

  async function handleCheckout() {
    if (!course) return
    if (!ageConfirmed) {
      setError('You must confirm you are 18 years of age or older to complete this purchase.')
      return
    }
    setPaying(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirectTo=/checkout?courseId=${courseId}`)
      return
    }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
      setPaying(false)
      return
    }

    if (json.url) {
      window.location.href = json.url
    }
  }

  if (!courseId) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
          No course selected.{' '}
          <Link href="/courses" className="gold-text" style={{ fontWeight: 600 }}>Browse courses →</Link>
        </p>
      </div>
    )
  }

  const price = course ? `$${(course.price / 100).toFixed(2)}` : '—'

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr minmax(0, 340px)', gap: '3rem', alignItems: 'start' }}>

      {/* Left — order details */}
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.875rem',
            color: 'var(--text-primary)', marginBottom: '2rem',
          }}
        >
          Complete Your Purchase
        </h1>

        {/* Course summary */}
        <div
          style={{
            background: '#FFFFFF', borderRadius: '1rem',
            border: '1px solid rgba(200,220,192,0.35)',
            overflow: 'hidden', marginBottom: '2rem',
          }}
        >
          <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
          <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div
              style={{
                width: '5rem', aspectRatio: '16/9', borderRadius: '0.5rem',
                background: 'var(--pale-botanical)', overflow: 'hidden', flexShrink: 0,
              }}
            >
              {course?.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--botanical-green)', opacity: 0.3 }}>L</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {loading ? (
                <div style={{ height: '1rem', background: 'var(--section-tint)', borderRadius: '0.25rem', width: '60%', marginBottom: '0.5rem' }} />
              ) : (
                <>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {course?.title}
                  </p>
                  {course?.subtitle && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {course.subtitle}
                    </p>
                  )}
                </>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
                background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {price}
            </span>
          </div>
        </div>

        {/* What's included */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
            What&apos;s Included
          </h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              'Lifetime access to all lessons',
              'Downloadable worksheets and resources',
              'Self-paced — go at your own speed',
              'Community support',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--botanical-green)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Security note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Secure checkout powered by Stripe. Your payment info is never stored on our servers.
          </span>
        </div>
      </div>

      {/* Right — payment card */}
      <div
        style={{
          background: '#FFFFFF', borderRadius: '1.25rem',
          border: '1px solid rgba(200,220,192,0.35)',
          boxShadow: '0 4px 24px -4px rgba(26,40,24,0.10)',
          overflow: 'hidden',
          position: 'sticky', top: '5rem',
        }}
      >
        <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
        <div style={{ padding: '1.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            Order Summary
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {course?.title ?? 'Course'}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {price}
            </span>
          </div>

          <div style={{ borderTop: '1px solid rgba(200,220,192,0.35)', paddingTop: '0.75rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
            <span
              style={{
                fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700,
                background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {price}
            </span>
          </div>

          {/* Age confirmation */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="checkout-age-confirm"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                color: 'var(--text-secondary)', lineHeight: 1.5,
              }}
            >
              <input
                id="checkout-age-confirm"
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                aria-required="true"
                style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', flexShrink: 0, accentColor: 'var(--botanical-green)', cursor: 'pointer' }}
              />
              I confirm I am <strong style={{ margin: '0 0.25rem' }}>18 years of age or older</strong>.
            </label>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
                background: '#FEF2F2', color: '#B91C1C',
                fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', border: '1px solid #FECACA',
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={paying || loading}
            className="btn-primary w-full"
            style={{ borderRadius: '0.5rem', padding: '0.9rem', marginBottom: '0.75rem', minHeight: '44px' }}
          >
            {paying ? 'Redirecting to payment…' : `Pay ${price}`}
          </button>

          <p
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              color: 'var(--text-muted)', textAlign: 'center' as const, lineHeight: 1.5,
            }}
          >
            By completing your purchase you agree to our{' '}
            <Link href="/terms" style={{ textDecoration: 'underline', color: 'var(--botanical-green)' }}>Terms</Link>
            {' '}and{' '}
            <Link href="/privacy-policy" style={{ textDecoration: 'underline', color: 'var(--botanical-green)' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <div style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>
      {/* Minimal header */}
      <header
        style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(200,220,192,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FFFFFF',
        }}
      >
        <Link href="/">
          <span
            className="gold-text"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 700 }}
          >
            Lumora Women
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Secure checkout
          </span>
        </div>
      </header>

      <main id="main-content">
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>Loading…</span>
          </div>
        }>
          <CheckoutContent />
        </Suspense>
      </main>
    </div>
  )
}
