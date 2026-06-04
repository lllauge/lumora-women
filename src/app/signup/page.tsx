'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import AuthCard from '@/components/layout/AuthCard'
import AuthInput from '@/components/ui/AuthInput'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ''

function passwordErrors(pw: string): string[] {
  const errs: string[] = []
  if (pw.length < 8)             errs.push('at least 8 characters')
  if (!/[A-Z]/.test(pw))        errs.push('one uppercase letter')
  if (!/[0-9]/.test(pw))        errs.push('one number')
  return errs
}

export default function SignUpPage() {
  const router = useRouter()
  const captchaRef = useRef<HCaptcha>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState('/dashboard')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const email = params.get('email')
    const nextPath = params.get('redirectTo')

    if (email) {
      setForm((f) => ({ ...f, email }))
    }
    if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
      setRedirectTo(nextPath)
    }
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required. Please enter your first name.'
    if (!form.lastName.trim())  e.lastName  = 'Last name is required. Please enter your last name.'
    if (!form.email.includes('@')) e.email = 'Enter a valid email address, for example jane@example.com.'

    const pwErrs = passwordErrors(form.password)
    if (pwErrs.length > 0) {
      e.password = `Password must contain: ${pwErrs.join(', ')}.`
    }
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'

    // Age confirmation
    if (!ageConfirmed) {
      e.age = 'You must confirm you are 18 years of age or older to create an account.'
    }

    // hCaptcha (only required when site key is configured)
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      e.captcha = 'Please complete the CAPTCHA.'
    }

    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    setServerError('')

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        captchaToken,
        redirectTo,
      }),
    })

    const result = await response.json().catch(() => ({} as { error?: string }))

    if (!response.ok) {
      setServerError(result.error || 'Your account could not be created. Please try again.')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
      return
    }

    // Redirect to a "check your email" page instead of straight to dashboard
    router.push(`/verify-email?email=${encodeURIComponent(form.email)}&redirectTo=${encodeURIComponent(redirectTo)}`)
  }

  const pwStrengthIssues = passwordErrors(form.password)
  const showPwHints = form.password.length > 0 && pwStrengthIssues.length > 0

  return (
    <AuthCard
      title="Create Your Free Account"
      subtitle="Join thousands of women on the journey back to themselves."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthInput label="First Name"  value={form.firstName} onChange={set('firstName')} error={errors.firstName} placeholder="Jane" required autoComplete="given-name" />
          <AuthInput label="Last Name"   value={form.lastName}  onChange={set('lastName')}  error={errors.lastName}  placeholder="Doe" required autoComplete="family-name" />
        </div>
        <AuthInput label="Email Address" type="email"    value={form.email}    onChange={set('email')}    error={errors.email}    placeholder="jane@example.com" required autoComplete="email" />
        <div>
          <AuthInput label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} placeholder="Min 8 chars, 1 uppercase, 1 number" required autoComplete="new-password" />
          {showPwHints && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
              Still needs: {pwStrengthIssues.join(', ')}.
            </p>
          )}
        </div>
        <AuthInput label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} placeholder="Repeat your password" required autoComplete="new-password" />

        {/* Age confirmation — required for legal contract compliance in California */}
        <div>
          <label
            htmlFor="age-confirm"
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
              border: errors.age ? '1px solid #FCA5A5' : '1px solid rgba(200,220,192,0.45)',
              background: ageConfirmed ? 'var(--pale-botanical)' : 'var(--warm-white)',
            }}
          >
            <input
              id="age-confirm"
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              aria-required="true"
              aria-describedby={errors.age ? 'age-confirm-error' : undefined}
              aria-invalid={errors.age ? 'true' : undefined}
              style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, accentColor: 'var(--botanical-green)', cursor: 'pointer' }}
            />
            <span style={{ flex: 1 }}>
              I confirm I am <strong style={{ fontWeight: 800 }}>18 years of age or older</strong>
            </span>
          </label>
          {errors.age && (
            <p id="age-confirm-error" role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: '#DC2626', marginTop: '0.375rem' }}>
              {errors.age}
            </p>
          )}
        </div>

        {/* hCaptcha — only rendered when site key is configured */}
        {HCAPTCHA_SITE_KEY && (
          <div>
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITE_KEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
            {errors.captcha && (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#B91C1C', marginTop: '0.25rem' }}>
                {errors.captcha}
              </p>
            )}
          </div>
        )}

        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="px-4 py-3 rounded-lg text-sm"
            style={{ background: '#FEF2F2', color: '#B91C1C', fontFamily: 'var(--font-sans)', border: '1px solid #FECACA' }}
          >
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
          style={{ borderRadius: '0.5rem', padding: '0.875rem' }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'var(--outline-variant)' }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--outline-variant)' }} />
      </div>

      <p className="text-center" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--warm-terracotta)', fontWeight: 600 }}>Log in</Link>
      </p>

      <p className="text-center mt-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
        By creating an account you agree to our{' '}
        <Link href="/terms" style={{ textDecoration: 'underline' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy-policy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>
    </AuthCard>
  )
}
