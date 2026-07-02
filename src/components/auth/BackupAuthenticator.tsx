'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Enrollment = { id: string; qrCode: string; secret: string }

export default function BackupAuthenticator({ dark = false }: { dark?: boolean }) {
  const [factorCount, setFactorCount] = useState<number | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const text = dark ? 'var(--admin-on-surface)' : 'var(--deep-earth)'
  const muted = dark ? 'var(--admin-on-surface-variant)' : 'var(--on-surface-variant)'
  const accent = dark ? 'var(--admin-celadon)' : '#3F6936'

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactorCount(data?.totp.filter((factor) => factor.status === 'verified').length ?? 0)
    })
  }, [])

  async function beginEnrollment() {
    setPending(true)
    setError('')
    setMessage('')
    const supabase = createClient()
    const result = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Lumora backup authenticator ${Date.now()}`,
    })
    setPending(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setEnrollment({
      id: result.data.id,
      qrCode: result.data.totp.qr_code,
      secret: result.data.totp.secret,
    })
  }

  async function verifyEnrollment() {
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError('Enter the current 6-digit code from the backup authenticator.')
      return
    }
    setPending(true)
    setError('')
    const supabase = createClient()
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.id })
    if (challenge.error) {
      setError(challenge.error.message)
      setPending(false)
      return
    }
    const verified = await supabase.auth.mfa.verify({
      factorId: enrollment.id,
      challengeId: challenge.data.id,
      code,
    })
    setPending(false)
    if (verified.error) {
      setError('That code was not accepted. Wait for a new code and try again.')
      return
    }
    setFactorCount((count) => (count ?? 0) + 1)
    setEnrollment(null)
    setCode('')
    setMessage('Backup authenticator added. Keep it on a separate trusted device or password manager.')
  }

  return (
    <div>
      <h2 style={{ fontFamily: dark ? 'var(--font-eb-garamond)' : 'var(--font-display)', fontSize: '1.125rem', color: text, marginBottom: '0.5rem' }}>
        Account recovery
      </h2>
      <p style={{ fontFamily: dark ? 'var(--font-hanken)' : 'var(--font-sans)', fontSize: '0.875rem', color: muted, lineHeight: 1.55, marginBottom: '1rem' }}>
        {factorCount === null
          ? 'Checking your authenticators…'
          : factorCount > 1
            ? `${factorCount} authenticators are enrolled. You have a backup if one device is lost.`
            : 'Add a second authenticator on another trusted device or password manager so you are not locked out if your phone is lost.'}
      </p>

      {!enrollment && (
        <button
          type="button"
          onClick={() => void beginEnrollment()}
          disabled={pending}
          style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `1px solid ${accent}`, background: 'transparent', color: accent, fontWeight: 800, cursor: 'pointer' }}
        >
          {pending ? 'Preparing…' : 'Add backup authenticator'}
        </button>
      )}

      {enrollment && (
        <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${accent}` }}>
          <p style={{ fontFamily: dark ? 'var(--font-hanken)' : 'var(--font-sans)', fontSize: '0.8125rem', color: muted, marginBottom: '0.75rem' }}>
            Scan this with the backup authenticator, then enter its current code.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qrCode} alt="Backup authenticator QR code" style={{ width: 180, height: 180, display: 'block', padding: '0.5rem', margin: '0 auto', background: '#FFFFFF', borderRadius: '0.625rem' }} />
          <details style={{ marginTop: '0.625rem' }}>
            <summary style={{ cursor: 'pointer', color: accent, fontWeight: 700, fontSize: '0.8125rem' }}>Enter a setup key instead</summary>
            <code style={{ display: 'block', marginTop: '0.5rem', overflowWrap: 'anywhere', color: text }}>{enrollment.secret}</code>
          </details>
          <input
            aria-label="Backup authenticator code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            style={{ width: '100%', boxSizing: 'border-box', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${accent}`, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.25em' }}
          />
          <button
            type="button"
            onClick={() => void verifyEnrollment()}
            disabled={pending || code.length !== 6}
            style={{ width: '100%', marginTop: '0.625rem', padding: '0.75rem', border: 0, borderRadius: '0.5rem', background: accent, color: dark ? 'var(--admin-primary-container)' : '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
          >
            {pending ? 'Verifying…' : 'Verify backup authenticator'}
          </button>
        </div>
      )}

      {error && <p role="alert" style={{ marginTop: '0.75rem', color: '#B42318', fontSize: '0.8125rem' }}>{error}</p>}
      {message && <p role="status" style={{ marginTop: '0.75rem', color: accent, fontSize: '0.8125rem', fontWeight: 700 }}>{message}</p>}
    </div>
  )
}
