'use client'

import { useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '@/components/layout/AuthCard'
import AuthInput from '@/components/ui/AuthInput'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ''
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  const captchaRef = useRef<HCaptcha>(null)

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const isLocked = lockedUntil !== null && new Date() < lockedUntil

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return

    // hCaptcha check (client-side only when configured)
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError('Please complete the CAPTCHA.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)

      if (newAttempts >= MAX_ATTEMPTS) {
        const unlockTime = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        setLockedUntil(unlockTime)
        setError(
          `Too many failed login attempts. Your account is temporarily locked for ${LOCKOUT_MINUTES} minutes. Please try again after ${unlockTime.toLocaleTimeString()}.`
        )
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts
        setError(
          remaining === 1
            ? 'Invalid email or password. 1 attempt remaining before temporary lockout.'
            : `Invalid email or password. ${remaining} attempts remaining.`
        )
      }
      setLoading(false)
      return
    }

    // Route admin to admin dashboard, students to student dashboard
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (userData?.role === 'admin') {
      router.push('/admin')
    } else {
      router.push(redirectTo)
    }
    router.refresh()
  }

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Log in to access your courses and continue your journey."
    >
      {isLocked && (
        <div
          className="px-4 py-3 rounded-lg text-sm mb-4"
          style={{ background: '#FFF7ED', color: '#92400E', fontFamily: 'var(--font-sans)', border: '1px solid #FED7AA' }}
        >
          Account temporarily locked due to too many failed attempts. Please try again after{' '}
          {lockedUntil?.toLocaleTimeString()}.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="Email Address"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="jane@example.com"
          required
        />
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--deep-earth)',
                letterSpacing: '0.02em',
              }}
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--warm-terracotta)' }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Your password"
            required
            aria-required="true"
            disabled={isLocked}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: '1.5px solid var(--outline-variant)',
              background: '#FFFFFF',
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              color: 'var(--deep-earth)',
              minHeight: '44px',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
          />
        </div>

        {/* hCaptcha, only rendered when site key is configured */}
        {HCAPTCHA_SITE_KEY && (
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
        )}

        {error && !isLocked && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{ background: '#FEF2F2', color: '#B91C1C', fontFamily: 'var(--font-sans)', border: '1px solid #FECACA' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isLocked}
          className="btn-primary w-full"
          style={{ borderRadius: '0.5rem', padding: '0.875rem' }}
        >
          {loading ? 'Logging in…' : isLocked ? 'Temporarily Locked' : 'Log In'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'var(--outline-variant)' }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--outline-variant)' }} />
      </div>

      <p className="text-center" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: 'var(--warm-terracotta)', fontWeight: 600 }}>Sign up free</Link>
      </p>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Welcome Back" subtitle="Log in to access your courses.">
        <div style={{ height: '200px' }} />
      </AuthCard>
    }>
      <LoginForm />
    </Suspense>
  )
}
