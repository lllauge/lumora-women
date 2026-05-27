'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle, Copy, Check } from 'lucide-react'
import { saveTotpSecret } from '@/app/actions/admin-totp'

export default function TotpSetupClient({
  secret,
  qrCodeDataUrl,
  userId,
}: {
  secret: string
  qrCodeDataUrl: string
  userId: string
}) {
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function copySecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const formData = new FormData()
    formData.set('token', token)
    formData.set('secret', secret)
    formData.set('userId', userId)
    startTransition(async () => {
      const result = await saveTotpSecret(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12"
           style={{ background: 'var(--admin-primary-container)' }}>
        <div className="w-full max-w-md text-center">
          <CheckCircle size={48} style={{ color: 'var(--admin-celadon)', margin: '0 auto 1rem' }} />
          <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.75rem', color: 'var(--admin-celadon-pale)', marginBottom: '1rem' }}>
            2FA Enabled Successfully
          </h1>
          <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.9rem', color: 'rgba(184, 204, 190, 0.8)', marginBottom: '2rem' }}>
            Two-factor authentication is now active. You will be asked for a code on every login.
          </p>
          <a
            href="/admin"
            style={{
              display: 'inline-block',
              padding: '0.875rem 2rem',
              background: 'var(--admin-celadon)',
              color: 'var(--admin-primary-container)',
              fontFamily: 'var(--font-hanken)',
              fontWeight: 700,
              borderRadius: '0.5rem',
              textDecoration: 'none',
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12"
         style={{ background: 'var(--admin-primary-container)' }}>
      <main id="main-content" className="w-full max-w-lg">
        <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.75rem', color: 'var(--admin-celadon-pale)', marginBottom: '0.5rem', textAlign: 'center' }}>
          Set Up Two-Factor Authentication
        </h1>
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: 'rgba(184, 137, 137, 0.8)', textAlign: 'center', marginBottom: '2rem' }}>
          Scan the QR code with Google Authenticator, Authy, or any TOTP app.
        </p>

        <div className="rounded-xl p-6 border space-y-6"
             style={{ background: 'rgba(0, 30, 20, 0.45)', borderColor: 'rgba(124, 156, 141, 0.15)' }}>

          {/* QR Code */}
          <div style={{ textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeDataUrl} alt="TOTP QR Code" style={{ width: '200px', height: '200px', margin: '0 auto', borderRadius: '0.75rem', padding: '0.5rem', background: 'white' }} />
          </div>

          {/* Manual entry */}
          <div>
            <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'rgba(200, 234, 218, 0.6)', marginBottom: '0.5rem' }}>
              Can&apos;t scan? Enter this code manually:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <code style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                background: 'rgba(0, 20, 12, 0.6)',
                borderRadius: '0.375rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: 'var(--admin-celadon)',
                letterSpacing: '0.1em',
                wordBreak: 'break-all',
              }}>
                {secret}
              </code>
              <button type="button" onClick={copySecret} title="Copy secret"
                      style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(124, 156, 141, 0.7)' }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Verification */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(200, 234, 218, 0.8)', display: 'block', marginBottom: '0.5rem' }}>
                Enter the 6-digit code to confirm setup
              </label>
              <input
                name="token"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: 'rgba(0, 30, 20, 0.5)',
                  border: '1px solid rgba(124, 156, 141, 0.30)',
                  borderRadius: '0.5rem',
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '1.5rem',
                  letterSpacing: '0.3em',
                  color: 'var(--admin-on-primary)',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p role="alert" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', color: 'var(--admin-rose-container)', background: 'rgba(255, 218, 217, 0.08)', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 218, 217, 0.20)', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={pending || token.length !== 6}
                    className="w-full flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{ padding: '0.875rem', background: 'var(--admin-celadon)', color: 'var(--admin-primary-container)', fontFamily: 'var(--font-hanken)', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
              {pending ? <><Loader2 size={18} className="animate-spin" /> Verifying…</> : 'Activate 2FA'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
