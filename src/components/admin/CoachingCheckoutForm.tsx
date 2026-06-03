'use client'

import { useState } from 'react'

export default function CoachingCheckoutForm() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [amount, setAmount] = useState('997')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    setCheckoutUrl('')

    const res = await fetch('/api/stripe/coaching-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName, lastName, amount: Number(amount) }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Could not create checkout link.')
    } else {
      setCheckoutUrl(data.url)
    }
    setPending(false)
  }

  return (
    <form onSubmit={submit} className="admin-card p-6 space-y-4">
      <div>
        <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--admin-on-surface)' }}>
          Create Coaching Checkout
        </h2>
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: 'var(--admin-on-surface-variant)' }}>
          Use this only after you have spoken with the client and decided they are a fit.
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

      <div className="grid md:grid-cols-[1fr_160px] gap-4">
        <label className="space-y-1">
          <span className="admin-label">Client Email</span>
          <input className="admin-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="admin-label">Amount USD</span>
          <input className="admin-input" type="number" min="1" max="25000" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
      </div>

      <button type="submit" className="btn-primary" disabled={pending} style={{ borderRadius: '0.5rem' }}>
        {pending ? 'Creating…' : 'Create Payment Link'}
      </button>

      {error && (
        <p role="alert" style={{ fontFamily: 'var(--font-hanken)', color: '#B42318' }}>{error}</p>
      )}

      {checkoutUrl && (
        <div className="rounded-lg p-4" style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)' }}>
          <p className="admin-label" style={{ marginBottom: '0.5rem' }}>Send this link to the client</p>
          <a href={checkoutUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: 'var(--admin-primary-container)', fontFamily: 'var(--font-hanken)' }}>
            {checkoutUrl}
          </a>
        </div>
      )}
    </form>
  )
}
