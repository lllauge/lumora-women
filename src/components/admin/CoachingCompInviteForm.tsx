'use client'

import { useState } from 'react'

export default function CoachingCompInviteForm() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [lang, setLang] = useState('en')
  const [signupUrl, setSignupUrl] = useState('')
  const [emailed, setEmailed] = useState<boolean | null>(null)
  const [emailError, setEmailError] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    setSignupUrl('')
    setEmailed(null)
    setEmailError('')

    const res = await fetch('/api/admin/coaching/comp-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName, lastName, lang }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Could not create invite.')
    } else {
      setSignupUrl(data.signupUrl)
      setEmailed(Boolean(data.emailed))
      setEmailError(data.emailError || '')
    }
    setPending(false)
  }

  return (
    <form onSubmit={submit} className="admin-card p-6 space-y-4">
      <div>
        <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--admin-on-surface)' }}>
          Invite Free Coaching Client
        </h2>
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: 'var(--admin-on-surface-variant)' }}>
          Skips payment. Use this for comped clients — family, friends, or anyone you&apos;re onboarding at no charge.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="admin-label">First Name</span>
          <input className="admin-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="admin-label">Last Name</span>
          <input className="admin-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="admin-label">Client Email</span>
        <input className="admin-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label className="space-y-1 block">
        <span className="admin-label">Onboarding Language</span>
        <select className="admin-input" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
        </select>
        <span style={{ display: 'block', fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', color: 'var(--admin-on-surface-variant)' }}>
          Spanish sends her invite email in Spanish and opens the onboarding form in Spanish.
        </span>
      </label>

      <button type="submit" className="btn-primary" disabled={pending} style={{ borderRadius: '0.5rem' }}>
        {pending ? 'Sending…' : 'Send Free Access Email'}
      </button>

      {error && (
        <p role="alert" style={{ fontFamily: 'var(--font-hanken)', color: '#B42318' }}>{error}</p>
      )}

      {signupUrl && (
        <div className="rounded-lg p-4" style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)' }}>
          <p className="admin-label" style={{ marginBottom: '0.5rem' }}>
            {emailed ? 'Free access email sent to client' : 'Free access link created'}
          </p>
          {emailed === false && (
            <p role="alert" style={{ fontFamily: 'var(--font-hanken)', color: '#B42318', marginBottom: '0.75rem' }}>
              Email did not send: {emailError || 'Unknown email error.'} Use the backup link below.
            </p>
          )}
          <a href={signupUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: 'var(--admin-primary-container)', fontFamily: 'var(--font-hanken)' }}>
            {signupUrl}
          </a>
        </div>
      )}
    </form>
  )
}
