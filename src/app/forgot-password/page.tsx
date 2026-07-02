'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthCard from '@/components/layout/AuthCard'
import AuthInput from '@/components/ui/AuthInput'
import { CheckCircle } from 'lucide-react'
import { executeRecaptcha } from '@/lib/recaptcha-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let captchaToken: string | null
    try {
      captchaToken = await executeRecaptcha('password_reset')
    } catch {
      setError('Security verification could not load. Please refresh and try again.')
      setLoading(false)
      return
    }

    const response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, captchaToken }),
    })

    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string }
      setError(result.error ?? 'Please wait before requesting another reset link.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthCard title="Check Your Inbox">
        <div className="text-center py-4">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
            style={{ background: 'var(--sage-green-light)' }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--sage-green-dark)' }} />
          </div>
          <p
            className="mb-6 leading-relaxed"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--on-surface-variant)' }}
          >
            We sent a password reset link to <strong style={{ color: 'var(--deep-earth)' }}>{email}</strong>. Check your inbox, it expires in 1 hour.
          </p>
          <Link
            href="/login"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--warm-terracotta)', fontWeight: 600 }}
          >
            ← Back to log in
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot Your Password?"
      subtitle="Enter your email and we'll send you a reset link right away."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          required
        />

        {error && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{ background: '#FEF2F2', color: '#B91C1C', fontFamily: 'var(--font-sans)', border: '1px solid #FECACA' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
          style={{ borderRadius: '0.5rem', padding: '0.875rem' }}
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p
        className="text-center mt-6"
        style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}
      >
        Remembered it?{' '}
        <Link href="/login" style={{ color: 'var(--warm-terracotta)', fontWeight: 600 }}>
          Back to log in
        </Link>
      </p>
    </AuthCard>
  )
}
