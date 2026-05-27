'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Loader2, Lock, X } from 'lucide-react'
import { exportEmailListCSV } from '@/app/actions/admin-email-list'

export default function ExportEmailListButton() {
  const [pending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [modalError, setModalError] = useState('')

  function openModal() {
    setPassword('')
    setModalError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setPassword('')
    setModalError('')
  }

  function handleExport() {
    if (!password) {
      setModalError('Please enter your password.')
      return
    }
    const q = searchParams?.get('q') ?? ''
    startTransition(async () => {
      const result = await exportEmailListCSV({ q, password })
      if (!result.ok) {
        setModalError(result.error)
        setPassword('')
        return
      }
      closeModal()
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={pending}
        className="admin-btn-secondary"
        style={{ cursor: pending ? 'wait' : 'pointer' }}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        <span>{pending ? 'Preparing…' : 'Export CSV'}</span>
      </button>

      {/* Re-auth modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            style={{
              background: 'var(--admin-surface)',
              borderRadius: '1rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '420px',
              border: '1px solid var(--admin-outline-variant)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} style={{ color: 'var(--admin-on-surface-variant)' }} />
                <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.25rem', color: 'var(--admin-on-surface)', margin: 0 }}>
                  Confirm Export
                </h2>
              </div>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: 'var(--admin-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              To protect subscriber data, please confirm your identity by entering your admin password before downloading the list.
            </p>

            <label style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--admin-on-surface)', display: 'block', marginBottom: '0.5rem' }}>
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleExport() }}
              placeholder="Your current password"
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1.5px solid var(--admin-outline-variant)',
                background: 'var(--admin-surface-low)',
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.9375rem',
                color: 'var(--admin-on-surface)',
                boxSizing: 'border-box',
                marginBottom: '0.5rem',
              }}
            />

            {modalError && (
              <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', color: '#c0392b', marginBottom: '1rem' }}>
                {modalError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" onClick={closeModal}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--admin-outline-variant)', background: 'transparent', fontFamily: 'var(--font-hanken)', fontWeight: 600, cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}>
                Cancel
              </button>
              <button type="button" onClick={handleExport} disabled={pending || !password}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'var(--admin-primary-container)', fontFamily: 'var(--font-hanken)', fontWeight: 700, cursor: 'pointer', color: 'var(--admin-celadon)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: pending || !password ? 0.6 : 1 }}>
                {pending ? <><Loader2 size={16} className="animate-spin" /> Exporting…</> : <><Download size={16} /> Download CSV</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
