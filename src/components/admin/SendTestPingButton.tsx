'use client'

import { useState, useTransition } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { sendTestPing } from '@/app/actions/admin-coaching'

export default function SendTestPingButton() {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleClick() {
    setStatus(null)
    startTransition(async () => {
      const result = await sendTestPing()
      setStatus(
        result.ok
          ? { ok: true, msg: 'Sent. Check your phone.' }
          : { ok: false, msg: result.reason }
      )
    })
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="admin-btn-secondary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem' }}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        {pending ? 'Sending...' : 'Send test ping'}
      </button>
      {status && (
        <span
          role="status"
          aria-live="polite"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            color: status.ok ? 'var(--botanical-green)' : '#8B2C2C',
          }}
        >
          {status.msg}
        </span>
      )}
    </div>
  )
}
