'use client'

import { useEffect, useState } from 'react'
import { executeRecaptcha } from '@/lib/recaptcha-client'

export default function ResendConfirmationForm() {
  const [email, setEmail] = useState('')
  const [redirectTo, setRedirectTo] = useState('/dashboard')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email')
    const nextPath = params.get('redirectTo')

    if (emailParam) {
      // Query parameters are only available after the client mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(emailParam)
    }
    if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
      setRedirectTo(nextPath)
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setMessage('')
    setError('')

    let captchaToken: string | null
    try {
      captchaToken = await executeRecaptcha('resend_confirmation')
    } catch {
      setError('Security verification could not load. Please refresh and try again.')
      setPending(false)
      return
    }

    const response = await fetch('/api/auth/resend-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo, captchaToken }),
    })
    const result = await response.json().catch(() => ({} as { error?: string }))

    if (!response.ok) {
      setError(result.error || 'Could not send a new link. Please try again.')
    } else {
      setMessage('A new secure link has been sent. Check your inbox and spam folder.')
    }

    setPending(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--deep-earth)', marginBottom: '0.375rem' }}>
          Email Address
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            width: '100%',
            minHeight: '44px',
            borderRadius: '0.5rem',
            border: '1px solid var(--outline-variant)',
            padding: '0.75rem 0.875rem',
            fontFamily: 'var(--font-sans)',
            background: '#FFFFFF',
          }}
        />
      </label>

      <button
        type="submit"
        className="btn-secondary w-full"
        disabled={pending}
        style={{ borderRadius: '0.5rem', padding: '0.75rem 1rem' }}
      >
        {pending ? 'Sending…' : 'Send New Link'}
      </button>

      {message && (
        <p role="status" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--botanical-green)', lineHeight: 1.5 }}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#B91C1C', lineHeight: 1.5 }}>
          {error}
        </p>
      )}
    </form>
  )
}
