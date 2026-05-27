'use client'

import { useState } from 'react'
import { subscribeToNewsletter } from '@/app/actions/subscribe'

export default function EmailCaptureForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const result = await subscribeToNewsletter(formData)

    if (result.error) {
      setErrorMsg(result.error)
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
          style={{ background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="#1A2818" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p
          className="text-2xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#FFFFFF' }}
        >
          You&apos;re in.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'rgba(200,220,192,0.7)', fontFamily: 'var(--font-sans)' }}>
          Check your inbox — something good is coming.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          name="first_name"
          type="text"
          placeholder="First name"
          required
          className="flex-1 px-6 py-4 rounded-full text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(200,220,192,0.2)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
          }}
        />
        <input
          name="email"
          type="email"
          placeholder="Your email address"
          required
          className="flex-1 px-6 py-4 rounded-full text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(200,220,192,0.2)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>
      <div className="flex justify-center mt-4">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary disabled:opacity-60"
          style={{ borderRadius: '9999px', padding: '0.875rem 2.5rem', fontSize: '0.9375rem' }}
        >
          {status === 'loading' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--botanical-light)', fontFamily: 'var(--font-sans)' }}>
          {errorMsg}
        </p>
      )}
      <p
        className="mt-6 text-xs text-center italic"
        style={{ color: 'rgba(200,220,192,0.4)', fontFamily: 'var(--font-sans)' }}
      >
        Respecting your space. No spam, only soul.
      </p>
    </form>
  )
}
