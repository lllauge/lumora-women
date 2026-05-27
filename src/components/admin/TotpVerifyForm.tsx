'use client'

import { useState, useTransition } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { verifyAdminTotp } from '@/app/actions/admin-auth'

export default function TotpVerifyForm() {
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await verifyAdminTotp(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="token"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'rgba(200, 234, 218, 0.8)',
            marginBottom: '0.5rem',
            marginLeft: '0.25rem',
            display: 'block',
          }}
        >
          Authenticator Code
        </label>
        <input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          placeholder="000000"
          disabled={pending}
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
            outline: 'none',
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-center"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            color: 'var(--admin-rose-container)',
            background: 'rgba(255, 218, 217, 0.08)',
            padding: '0.625rem 0.875rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 218, 217, 0.20)',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || token.length !== 6}
        className="w-full flex items-center justify-center gap-2 group transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          marginTop: '1.5rem',
          padding: '0.875rem 1.25rem',
          borderRadius: '0.5rem',
          background: 'var(--admin-celadon)',
          color: 'var(--admin-primary-container)',
          fontFamily: 'var(--font-hanken)',
          fontWeight: 700,
          fontSize: '0.9375rem',
          letterSpacing: '0.05em',
          border: 'none',
          cursor: pending ? 'wait' : 'pointer',
          boxShadow: '0 10px 25px -10px rgba(173, 206, 190, 0.4)',
        }}
      >
        {pending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Verifying…</span>
          </>
        ) : (
          <>
            <span>Verify & Continue</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      <p
        className="text-center"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          color: 'rgba(124, 156, 141, 0.5)',
        }}
      >
        Code not working?{' '}
        <a
          href="/admin/login"
          style={{ color: 'rgba(124, 156, 141, 0.8)', textDecoration: 'underline' }}
        >
          Go back to login
        </a>
      </p>
    </form>
  )
}
