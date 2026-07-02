'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '@/components/layout/AuthCard'

type TotpEnrollment = {
  qrCode: string
  secret: string
}

function safeRedirect(value: string | null, fallback: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}

function VerificationCodeInput({
  code,
  onChange,
}: {
  code: string
  onChange: (value: string) => void
}) {
  return (
    <>
      <label htmlFor="mfa-code" style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        6-digit verification code
      </label>
      <input
        id="mfa-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        autoFocus
        style={{ width: '100%', padding: '0.875rem', border: '1px solid rgba(63,105,54,0.3)', borderRadius: '0.625rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em', boxSizing: 'border-box' }}
      />
    </>
  )
}

function ErrorMessage({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" style={{ marginTop: '0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: '#FFF1F0', color: '#9F2D20', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>
      {message}
    </p>
  )
}

function ClientEmailMfa() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const destination = safeRedirect(searchParams.get('redirectTo'), '/dashboard')
  const initialized = useRef(false)
  const [mode, setMode] = useState<'loading' | 'code' | 'success'>('loading')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function sendCode() {
    setPending(true)
    setError('')
    const response = await fetch('/api/auth/email-mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'send' }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string }
    setPending(false)
    if (!response.ok) {
      setError(result.error ?? 'We could not email your security code.')
      setMode('code')
      return
    }
    setCode('')
    setMode('code')
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const supabase = createClient()

    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
      void sendCode()
    })
  }, [])

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code sent to your email.')
      return
    }
    setPending(true)
    setError('')
    const response = await fetch('/api/auth/email-mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'verify', code }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) {
      setError(result.error ?? 'That code was not accepted. Request a new code and try again.')
      setPending(false)
      return
    }
    setMode('success')
    window.setTimeout(() => {
      router.replace(destination)
      router.refresh()
    }, 600)
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  if (mode === 'loading') {
    return (
      <AuthCard title="Sending your security code" subtitle="We’re emailing you a 6-digit verification code.">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 className="animate-spin" aria-label="Loading" />
        </div>
      </AuthCard>
    )
  }

  if (mode === 'success') {
    return (
      <AuthCard title="You’re verified" subtitle="Your account is protected with two-step authentication.">
        <CheckCircle style={{ width: '3rem', height: '3rem', color: '#3F6936', margin: '1rem auto' }} aria-hidden="true" />
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Check your email"
      subtitle={email
        ? `Enter the 6-digit security code sent to ${email}.`
        : 'Enter the 6-digit security code we sent to your email.'}
    >
      <div style={{ textAlign: 'center' }}>
        <ShieldCheck style={{ width: '2rem', height: '2rem', color: '#3F6936', margin: '0 auto 1rem' }} aria-hidden="true" />
      </div>

      <form onSubmit={verifyCode}>
        <VerificationCodeInput code={code} onChange={setCode} />
        <ErrorMessage message={error} />
        <button type="submit" disabled={pending || code.length !== 6} style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', border: 0, borderRadius: '0.625rem', background: '#3F6936', color: '#FFFFFF', fontFamily: 'var(--font-sans)', fontWeight: 800, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>
          {pending ? 'Verifying…' : 'Verify and continue'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void sendCode()}
          style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', border: 0, background: 'transparent', color: '#3F6936', fontFamily: 'var(--font-sans)', fontWeight: 700, cursor: 'pointer' }}
        >
          {pending ? 'Sending…' : 'Email me a new code'}
        </button>
      </form>

      <button type="button" onClick={() => void signOut()} style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', border: 0, background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', cursor: 'pointer' }}>
        Sign out
      </button>
    </AuthCard>
  )
}

function AdminAuthenticatorMfa() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedMode = searchParams.get('mode') === 'challenge' ? 'challenge' : 'enroll'
  const destination = safeRedirect(searchParams.get('redirectTo'), '/admin')
  const initialized = useRef(false)
  const [mode, setMode] = useState<'loading' | 'enroll' | 'challenge' | 'success'>('loading')
  const [factorId, setFactorId] = useState('')
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const supabase = createClient()

    void (async () => {
      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error) {
        setError('We could not load your security settings. Please sign in again.')
        setMode('challenge')
        return
      }
      const verified = factors.data.totp.find((factor) => factor.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setMode('challenge')
        return
      }
      for (const factor of factors.data.all) {
        if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
      if (requestedMode === 'challenge') setError('No authenticator is enrolled yet. Set one up to continue.')
      const enrolled = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Lumora Women admin authenticator',
      })
      if (enrolled.error) {
        setError(enrolled.error.message)
        setMode('enroll')
        return
      }
      setFactorId(enrolled.data.id)
      setEnrollment({ qrCode: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret })
      setMode('enroll')
    })()
  }, [requestedMode])

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setPending(true)
    setError('')
    const supabase = createClient()
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) {
      setError(challenge.error.message)
      setPending(false)
      return
    }
    const verified = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code })
    if (verified.error) {
      setError('That code was not accepted. Wait for a new code and try again.')
      setPending(false)
      return
    }
    setMode('success')
    window.setTimeout(() => {
      router.replace(destination)
      router.refresh()
    }, 600)
  }

  if (mode === 'loading') {
    return (
      <AuthCard title="Securing the admin account" subtitle="Loading authenticator verification…">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" aria-label="Loading" /></div>
      </AuthCard>
    )
  }

  if (mode === 'success') {
    return (
      <AuthCard title="You’re verified" subtitle="Administrator access is protected.">
        <CheckCircle style={{ width: '3rem', height: '3rem', color: '#3F6936', margin: '1rem auto' }} aria-hidden="true" />
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={mode === 'enroll' ? 'Protect the admin account' : 'Enter your admin security code'}
      subtitle={mode === 'enroll' ? 'Authenticator-app verification is required for administrator access.' : 'Open your authenticator app and enter the current code.'}
    >
      {mode === 'enroll' && enrollment && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1rem' }}>
            Scan this QR code using your authenticator app.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qrCode} alt="Admin authenticator setup QR code" style={{ width: 200, height: 200, display: 'block', margin: '0 auto', padding: '0.5rem', borderRadius: '0.75rem', background: '#FFFFFF' }} />
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#3F6936', fontWeight: 700 }}>Can’t scan the QR code?</summary>
            <code style={{ display: 'block', marginTop: '0.5rem', padding: '0.625rem', borderRadius: '0.5rem', background: 'var(--section-tint)', overflowWrap: 'anywhere', letterSpacing: '0.08em' }}>{enrollment.secret}</code>
          </details>
        </div>
      )}
      <form onSubmit={verify}>
        <VerificationCodeInput code={code} onChange={setCode} />
        <ErrorMessage message={error} />
        <button type="submit" disabled={pending || code.length !== 6 || !factorId} style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', border: 0, borderRadius: '0.625rem', background: '#3F6936', color: '#FFFFFF', fontFamily: 'var(--font-sans)', fontWeight: 800, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>
          {pending ? 'Verifying…' : mode === 'enroll' ? 'Enable and continue' : 'Verify and continue'}
        </button>
      </form>
    </AuthCard>
  )
}

function MfaRouter() {
  const searchParams = useSearchParams()
  return searchParams.get('area') === 'admin'
    ? <AdminAuthenticatorMfa />
    : <ClientEmailMfa />
}

export default function MfaPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Securing your account" subtitle="Loading two-step authentication…">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" aria-label="Loading" /></div>
      </AuthCard>
    }>
      <MfaRouter />
    </Suspense>
  )
}
