'use client'

import { useState, useTransition } from 'react'
import { AtSign, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { signInAdmin } from '@/app/actions/admin-auth'

const fieldShellStyle: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(0, 30, 20, 0.5)',
  border: '1px solid rgba(124, 156, 141, 0.30)',
  borderRadius: '0.5rem',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  overflow: 'hidden',
}

const focusedShellStyle: React.CSSProperties = {
  ...fieldShellStyle,
  borderColor: 'var(--admin-celadon)',
  boxShadow: '0 0 0 2px rgba(173, 206, 190, 0.20)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 0.875rem 0.875rem 2.5rem',
  background: 'transparent',
  border: 'none',
  fontFamily: 'var(--font-hanken)',
  fontSize: '0.9375rem',
  color: 'var(--admin-on-primary)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-hanken)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  color: 'rgba(200, 234, 218, 0.8)',
  marginBottom: '0.5rem',
  marginLeft: '0.25rem',
  display: 'block',
}

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '0.875rem',
  transform: 'translateY(-50%)',
  color: 'rgba(124, 156, 141, 0.55)',
  pointerEvents: 'none',
  width: '18px',
  height: '18px',
}

export default function AdminLoginForm({ initialError }: { initialError?: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [error, setError] = useState<string | undefined>(initialError)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await signInAdmin(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Email */}
      <div>
        <label htmlFor="email" style={labelStyle}>Email Address</label>
        <div style={emailFocused ? focusedShellStyle : fieldShellStyle}>
          <AtSign style={iconStyle} />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@lumora.com"
            disabled={pending}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <div style={passwordFocused ? focusedShellStyle : fieldShellStyle}>
          <Lock style={iconStyle} />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={pending}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            style={{ ...inputStyle, paddingRight: '2.75rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              top: '50%',
              right: '0.75rem',
              transform: 'translateY(-50%)',
              color: 'rgba(124, 156, 141, 0.55)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Error */}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
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
            <span>Authenticating…</span>
          </>
        ) : (
          <>
            <span>Login</span>
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </>
        )}
      </button>
    </form>
  )
}
