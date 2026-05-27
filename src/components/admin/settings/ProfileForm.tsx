'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { changeAdminPassword, updateAdminProfile } from '@/app/actions/admin-settings'

export default function ProfileForm({
  initial,
}: {
  initial: { first_name: string; last_name: string; email: string }
}) {
  const [pending, startTransition] = useTransition()
  const [pwPending, startPwTransition] = useTransition()
  const [profileResult, setProfileResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [pwResult, setPwResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileResult(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateAdminProfile(fd)
      setProfileResult({
        ok: !!result.ok,
        msg: result.ok ? 'Profile saved.' : (result.error ?? 'Could not save profile.'),
      })
    })
  }

  function handlePasswordSubmit() {
    if (!password) return
    setPwResult(null)
    const fd = new FormData()
    fd.set('password', password)
    startPwTransition(async () => {
      const result = await changeAdminPassword(fd)
      setPwResult({
        ok: !!result.ok,
        msg: result.ok ? 'Password updated.' : (result.error ?? 'Could not update password.'),
      })
      if (result.ok) setPassword('')
    })
  }

  return (
    <section className="admin-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.375rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}>
            Account Settings
          </h3>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            color: 'var(--admin-on-surface-variant)',
            marginTop: '0.25rem',
          }}>
            Update your personal credentials and identity information.
          </p>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name">
            <input
              type="text"
              name="first_name"
              required
              defaultValue={initial.first_name}
              style={{ background: 'var(--admin-surface-low)' }}
            />
          </Field>
          <Field label="Last Name">
            <input
              type="text"
              name="last_name"
              defaultValue={initial.last_name}
              style={{ background: 'var(--admin-surface-low)' }}
            />
          </Field>
        </div>
        <Field label="Email Address">
          <input
            type="email"
            name="email"
            required
            defaultValue={initial.email}
            style={{ background: 'var(--admin-surface-low)' }}
          />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="admin-btn-primary"
            style={{ cursor: pending ? 'wait' : 'pointer' }}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>{pending ? 'Saving…' : 'Save Profile'}</span>
          </button>
          {profileResult && <Result {...profileResult} />}
        </div>
      </form>

      <div className="h-px" style={{ background: 'var(--admin-outline-variant)', opacity: 0.6 }} />

      <div className="space-y-3">
        <Field label="New Password">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep your current password"
              autoComplete="new-password"
              style={{ background: 'var(--admin-surface-low)', paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="p-1"
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          color: 'var(--admin-on-surface-variant)',
          margin: 0,
        }}>
          Minimum 12 characters recommended.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePasswordSubmit}
            disabled={pwPending || !password}
            className="admin-btn-secondary"
            style={{ cursor: pwPending ? 'wait' : 'pointer' }}
          >
            {pwPending ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>{pwPending ? 'Updating…' : 'Update Password'}</span>
          </button>
          {pwResult && <Result {...pwResult} />}
        </div>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="uppercase block mb-1.5"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'var(--admin-on-surface-variant)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function Result({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-1.5"
      style={{
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: ok ? 'var(--admin-sage)' : 'var(--admin-error)',
        margin: 0,
      }}
    >
      {ok && <CheckCircle size={14} />}
      {msg}
    </p>
  )
}
