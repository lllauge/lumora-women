'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { createClient } from '@/lib/supabase/client'
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

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        captchaToken: captchaToken ?? undefined,
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setServerError(error.message)
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
      return
    }

    if (!data.user?.id) {
      setServerError('Your account could not be created. Please try again or contact support.')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
      return
    }

    // Redirect to a "check your email" page instead of straight to dashboard
    router.push('/verify-email')
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
          <AuthInput label="First Name"  value={form.firstName} onChange={set('firstName')} error={errors.firstName} placeholder="Jane" />
          <AuthInput label="Last Name"   value={form.lastName}  onChange={set('lastName')}  error={errors.lastName}  placeholder="Doe" />
        </div>
        <AuthInput label="Email Address" type="email"    value={form.email}    onChange={set('email')}    error={errors.email}    placeholder="jane@example.com" />
        <div>
          <AuthInput label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} placeholder="Min 8 chars, 1 uppercase, 1 number" />
          {showPwHints && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
              Still needs: {pwStrengthIssues.join(', ')}.
            </p>
          )}
        </div>
        <AuthInput label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} placeholder="Repeat your password" />

        {/* Age confirmation — required for legal contract compliance in California */}
        <div>
          <label
            htmlFor="age-confirm"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
              color: 'var(--deep-earth)', lineHeight: 1.5,
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
              style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', flexShrink: 0, accentColor: 'var(--botanical-green)', cursor: 'pointer' }}
            />
            I confirm I am <strong style={{ marginLeft: '0.25rem', marginRight: '0.25rem' }}>18 years of age or older</strong>.
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
