'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/layout/AuthCard'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 12) {
      setError('Use at least 12 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setPending(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setPending(false)
      return
    }
    await supabase.auth.signOut({ scope: 'global' })
    router.replace('/login?passwordReset=success')
    router.refresh()
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Use a unique password you do not use anywhere else.">
      <form onSubmit={submit} className="space-y-4">
        <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700 }}>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={12}
            required
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.375rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }}
          />
        </label>
        <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700 }}>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={12}
            required
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.375rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)' }}
          />
        </label>
        {error && <p role="alert" style={{ color: '#B42318', fontSize: '0.8125rem' }}>{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full" style={{ padding: '0.875rem', borderRadius: '0.5rem' }}>
          {pending ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  )
}
