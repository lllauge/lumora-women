'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '@/components/layout/AuthCard'

type Enrollment = {
  factorId: string
  qrCode: string
  secret: string
}

function safeRedirect(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

function MfaFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedMode = searchParams.get('mode') === 'challenge' ? 'challenge' : 'enroll'
  const destination = safeRedirect(searchParams.get('redirectTo'))
  const initialized = useRef(false)
  const [mode, setMode] = useState<'loading' | 'enroll' | 'challenge' | 'success'>('loading')
  const [factorId, setFactorId] = useState('')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
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
        if (factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id })
        }
      }

      if (requestedMode === 'challenge') {
        setError('No authenticator is enrolled yet. Set one up to continue.')
      }
      const enrolled = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Lumora Women authenticator',
      })
      if (enrolled.error) {
        setError(enrolled.error.message)
        setMode('enroll')
        return
      }
      setFactorId(enrolled.data.id)
      setEnrollment({
        factorId: enrolled.data.id,
        qrCode: enrolled.data.totp.qr_code,
        secret: enrolled.data.totp.secret,
      })
      setMode('enroll')
    })()
  }, [requestedMode])

  async function verify() {
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
    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    })
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

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  if (mode === 'loading') {
    return (
      <AuthCard title="Securing your account" subtitle="Loading two-step authentication…">
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
      title={mode === 'enroll' ? 'Protect your account' : 'Enter your security code'}
      subtitle={mode === 'enroll'
        ? 'Two-step authentication is required to protect your private coaching information.'
        : 'Open your authenticator app and enter the current 6-digit code.'}
    >
      <div style={{ textAlign: 'center' }}>
        <ShieldCheck style={{ width: '2rem', height: '2rem', color: '#3F6936', margin: '0 auto 1rem' }} aria-hidden="true" />
      </div>

      {mode === 'enroll' && enrollment && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1rem' }}>
            Scan this QR code using Google Authenticator, Microsoft Authenticator, Authy, or another authenticator app.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="Authenticator setup QR code"
            style={{ width: 200, height: 200, display: 'block', margin: '0 auto', padding: '0.5rem', borderRadius: '0.75rem', background: '#FFFFFF' }}
          />
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#3F6936', fontWeight: 700 }}>
              Can’t scan the QR code?
            </summary>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Enter this setup key manually:
            </p>
            <code style={{ display: 'block', marginTop: '0.25rem', padding: '0.625rem', borderRadius: '0.5rem', background: 'var(--section-tint)', overflowWrap: 'anywhere', letterSpacing: '0.08em' }}>
              {enrollment.secret}
            </code>
          </details>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void verify()
        }}
      >
        <label htmlFor="mfa-code" style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
          6-digit authentication code
        </label>
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoFocus
          style={{ width: '100%', padding: '0.875rem', border: '1px solid rgba(63,105,54,0.3)', borderRadius: '0.625rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em', boxSizing: 'border-box' }}
        />
        {error && (
          <p role="alert" style={{ marginTop: '0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: '#FFF1F0', color: '#9F2D20', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || code.length !== 6 || !factorId}
          style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', border: 0, borderRadius: '0.625rem', background: '#3F6936', color: '#FFFFFF', fontFamily: 'var(--font-sans)', fontWeight: 800, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}
        >
          {pending ? 'Verifying…' : mode === 'enroll' ? 'Enable and continue' : 'Verify and continue'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void signOut()}
        style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', border: 0, background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', cursor: 'pointer' }}
      >
        Sign out
      </button>
    </AuthCard>
  )
}

export default function MfaPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Securing your account" subtitle="Loading two-step authentication…">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 className="animate-spin" aria-label="Loading" />
        </div>
      </AuthCard>
    }>
      <MfaFlow />
    </Suspense>
  )
}
