'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard from '@/components/layout/AuthCard'
import AuthInput from '@/components/ui/AuthInput'
import { executeRecaptcha } from '@/lib/recaptcha-client'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedRedirect = searchParams.get('redirectTo')
  const redirectTo = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
    ? requestedRedirect
    : '/dashboard'
  const inactivityMessage = searchParams.get('error') === 'inactive'
    ? 'Your secure session expired. Please log in again.'
    : ''
  const passwordResetMessage = searchParams.get('passwordReset') === 'success'
    ? 'Your password was updated. Please log in with your new password.'
    : ''
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [codeNotice, setCodeNotice] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const isLocked = lockedUntil !== null && new Date() < lockedUntil

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return

    setLoading(true)
    setError('')

    let captchaToken: string | null
    try {
      captchaToken = await executeRecaptcha('login')
    } catch {
      setError('Security verification could not load. Please refresh and try again.')
      setLoading(false)
      return
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        captchaToken,
      }),
    })
    const result = await response.json().catch(() => ({})) as {
      error?: string
      role?: 'admin' | 'user'
      mfaMode?: 'enroll' | 'challenge' | null
    }

    if (!response.ok) {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      if (response.status === 429 || newAttempts >= MAX_ATTEMPTS) {
        const unlockTime = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        setLockedUntil(unlockTime)
        setError(
          `Too many failed login attempts. Your account is temporarily locked for ${LOCKOUT_MINUTES} minutes. Please try again after ${unlockTime.toLocaleTimeString()}.`
        )
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts
        setError(result.error || (
          remaining === 1
            ? 'Invalid email or password. 1 attempt remaining before temporary lockout.'
            : `Invalid email or password. ${remaining} attempts remaining.`
        ))
      }
      setLoading(false)
      return
    }

    if (result.role === 'admin') {
      router.push('/admin')
    } else {
      router.push(`/mfa?area=client&mode=${result.mfaMode ?? 'challenge'}&redirectTo=${encodeURIComponent(redirectTo)}`)
    }
    router.refresh()
  }

  async function handleSendCode() {
    if (!form.email) {
      setCodeError('Enter your email address above first.')
      return
    }

    setCodeLoading(true)
    setCodeError('')
    setCodeNotice('')

    let captchaToken: string | null
    try {
      captchaToken = await executeRecaptcha('login_code_send')
    } catch {
      setCodeError('Security verification could not load. Please refresh and try again.')
      setCodeLoading(false)
      return
    }

    const response = await fetch('/api/auth/login-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'send', email: form.email, captchaToken }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string }

    if (!response.ok) {
      setCodeError(result.error || 'Could not send a login code. Please try again.')
      setCodeLoading(false)
      return
    }

    setCodeSent(true)
    setCode('')
    setCodeNotice('If that email has an account, a login code is on its way. Check your inbox.')
    setCodeLoading(false)
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setCodeLoading(true)
    setCodeError('')

    const response = await fetch('/api/auth/login-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'verify', email: form.email, code }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string }

    if (!response.ok) {
      setCodeError(result.error || 'That code is incorrect or expired.')
      setCodeLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Log in to access your courses and continue your journey."
    >
      {inactivityMessage && (
        <div
          className="px-4 py-3 rounded-lg text-sm mb-4"
          style={{ background: '#FFF7ED', color: '#92400E', fontFamily: 'var(--font-sans)', border: '1px solid #FED7AA' }}
        >
          {inactivityMessage}
        </div>
      )}
      {passwordResetMessage && (
        <div
          className="px-4 py-3 rounded-lg text-sm mb-4"
          style={{ background: '#ECFDF3', color: '#166534', fontFamily: 'var(--font-sans)', border: '1px solid #BBF7D0' }}
        >
          {passwordResetMessage}
        </div>
      )}
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

      {failedAttempts >= 2 && (
        <div
          className="mt-5 px-4 py-4 rounded-lg"
          style={{ background: '#F8F6F0', border: '1px solid var(--outline-variant)' }}
        >
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--deep-earth)', fontWeight: 600, marginBottom: 6 }}>
            Having trouble with your password?
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: 12 }}>
            We can email you a one-time code to log in without it.
          </p>

          {codeNotice && (
            <div
              className="px-3 py-2 rounded-lg text-sm mb-3"
              style={{ background: '#ECFDF3', color: '#166534', fontFamily: 'var(--font-sans)', border: '1px solid #BBF7D0' }}
            >
              {codeNotice}
            </div>
          )}
          {codeError && (
            <div
              className="px-3 py-2 rounded-lg text-sm mb-3"
              style={{ background: '#FEF2F2', color: '#B91C1C', fontFamily: 'var(--font-sans)', border: '1px solid #FECACA' }}
            >
              {codeError}
            </div>
          )}

          {codeSent ? (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <label
                htmlFor="login-code"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--deep-earth)',
                  letterSpacing: '0.02em',
                  display: 'block',
                }}
              >
                Login Code From Your Email
              </label>
              <input
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                pattern="\d{6,10}"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter your code"
                required
                aria-required="true"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1.5px solid var(--outline-variant)',
                  background: '#FFFFFF',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '1.15rem',
                  letterSpacing: '0.35em',
                  color: 'var(--deep-earth)',
                  minHeight: '44px',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--sage-green-deep)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
              />
              <button
                type="submit"
                disabled={codeLoading || code.length < 6}
                className="btn-primary w-full"
                style={{ borderRadius: '0.5rem', padding: '0.75rem' }}
              >
                {codeLoading ? 'Verifying…' : 'Log In With Code'}
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={codeLoading}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8rem',
                  color: 'var(--warm-terracotta)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                Send a new code
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={codeLoading}
              className="w-full"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--sage-green-deep)',
                background: '#FFFFFF',
                border: '1.5px solid var(--sage-green-deep)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              {codeLoading ? 'Sending…' : 'Email Me a Login Code'}
            </button>
          )}
        </div>
      )}

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
