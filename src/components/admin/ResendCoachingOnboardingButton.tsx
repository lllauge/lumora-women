'use client'

import { useState } from 'react'

export default function ResendCoachingOnboardingButton({ clientId }: { clientId: string }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [signupUrl, setSignupUrl] = useState('')

  async function resend() {
    setPending(true)
    setMessage('')
    setError('')
    setSignupUrl('')

    const response = await fetch('/api/admin/coaching/resend-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Could not resend onboarding email.')
    } else {
      setSignupUrl(data.signupUrl || '')
      setMessage(data.emailed ? 'Onboarding email resent.' : 'Email did not send. Use the backup link.')
      if (data.emailError) setError(data.emailError)
    }
    setPending(false)
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
      <button
        type="button"
        className="admin-btn-secondary"
        style={{ padding: '0.45rem 0.85rem' }}
        onClick={resend}
        disabled={pending}
      >
        {pending ? 'Sending...' : 'Resend Email'}
      </button>
      {(message || error || signupUrl) && (
        <div style={{ maxWidth: 280, textAlign: 'right', fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', lineHeight: 1.35 }}>
          {message && <p style={{ color: 'var(--admin-on-surface-variant)', margin: 0 }}>{message}</p>}
          {error && <p role="alert" style={{ color: '#B42318', margin: 0 }}>{error}</p>}
          {signupUrl && (
            <a href={signupUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--admin-primary-container)', wordBreak: 'break-all' }}>
              Backup link
            </a>
          )}
        </div>
      )}
    </div>
  )
}

