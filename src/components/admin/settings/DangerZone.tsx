'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { clearTestData } from '@/app/actions/admin-settings'

export default function DangerZone() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleClick() {
    const phrase = 'CLEAR TEST DATA'
    const typed = window.prompt(
      `This will permanently delete:\n` +
        `  • enrollments for users whose email contains "test"\n` +
        `  • orders for those users\n` +
        `  • email subscribers whose email contains "test"\n\n` +
        `Type ${phrase} to confirm.`
    )
    if (typed !== phrase) return

    setResult(null)
    startTransition(async () => {
      const res = await clearTestData()
      if (!res.ok) {
        setResult({ ok: false, msg: res.error })
        return
      }
      const { enrollments, orders, subscribers } = res.removed
      setResult({
        ok: true,
        msg: `Removed ${enrollments} enrollment${enrollments === 1 ? '' : 's'}, ${orders} order${orders === 1 ? '' : 's'}, and ${subscribers} subscriber${subscribers === 1 ? '' : 's'}.`,
      })
    })
  }

  return (
    <section
      className="p-6 rounded-xl space-y-4"
      style={{
        background: 'var(--admin-rose-fixed)',
        border: '1px solid var(--admin-rose-container)',
      }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={22} style={{ color: 'var(--admin-error)', flexShrink: 0, marginTop: '2px' }} />
        <div className="flex-1">
          <h3 style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.375rem',
            fontWeight: 500,
            color: 'var(--admin-on-rose-fixed)',
            margin: 0,
          }}>
            Danger Zone
          </h3>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            color: 'var(--admin-on-rose-fixed)',
            opacity: 0.85,
            marginTop: '0.25rem',
          }}>
            Irreversible actions that modify the core system state. Proceed with care.
          </p>
        </div>
      </div>

      <div
        className="p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ background: 'rgba(255, 255, 255, 0.5)' }}
      >
        <div>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'var(--admin-on-rose-fixed)',
            margin: 0,
          }}>
            Clear Test Data
          </p>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-rose-fixed)',
            opacity: 0.85,
            marginTop: '0.125rem',
          }}>
            Removes enrollments, orders, and subscribers tied to any user whose email contains the word <code>test</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="admin-btn-danger whitespace-nowrap"
          style={{ cursor: pending ? 'wait' : 'pointer' }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          <span>{pending ? 'Clearing…' : 'Clear Test Data'}</span>
        </button>
      </div>

      {result && (
        <p
          role="status"
          className="flex items-start gap-2 p-3 rounded-md"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            background: result.ok ? 'rgba(255, 255, 255, 0.7)' : 'rgba(186, 26, 26, 0.10)',
            color: result.ok ? 'var(--admin-sage-deep, var(--admin-on-sage-container))' : 'var(--admin-error)',
            margin: 0,
          }}
        >
          {result.ok && <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
          <span>{result.msg}</span>
        </p>
      )}
    </section>
  )
}
