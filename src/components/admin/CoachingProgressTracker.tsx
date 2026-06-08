'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

type ProgressLog = {
  id: string
  logged_at: string
  weight: string | null
  body_fat: string | null
  waist: string | null
  hips: string | null
  notes: string | null
}

type Props = {
  clientId: string
  initialLogs: ProgressLog[]
}

function firstNumber(value: string | null) {
  const match = String(value ?? '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function weightChange(logs: ProgressLog[]) {
  const sorted = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  const first = firstNumber(sorted[0]?.weight ?? null)
  const latest = firstNumber(sorted[sorted.length - 1]?.weight ?? null)
  if (first === null || latest === null) return null
  return latest - first
}

function bodyFatChange(logs: ProgressLog[]) {
  const sorted = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  const first = firstNumber(sorted[0]?.body_fat ?? null)
  const latest = firstNumber(sorted[sorted.length - 1]?.body_fat ?? null)
  if (first === null || latest === null) return null
  return latest - first
}

export default function CoachingProgressTracker({ clientId, initialLogs }: Props) {
  const [logs, setLogs] = useState(initialLogs)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const change = weightChange(logs)
  const fatChange = bodyFatChange(logs)

  async function addLog(formData: FormData) {
    setPending(true)
    setError('')
    setMessage('')

    const response = await fetch('/api/admin/coaching/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        loggedAt: String(formData.get('loggedAt') ?? ''),
        weight: String(formData.get('weight') ?? ''),
        bodyFat: String(formData.get('bodyFat') ?? ''),
        waist: String(formData.get('waist') ?? ''),
        hips: String(formData.get('hips') ?? ''),
        notes: String(formData.get('notes') ?? ''),
      }),
    })
    const result = await response.json().catch(() => ({} as { error?: string; log?: ProgressLog }))

    if (!response.ok || !result.log) {
      setError(result.error || 'Could not save progress log.')
    } else {
      setLogs((current) => [result.log as ProgressLog, ...current])
      setMessage('Progress log saved.')
    }

    setPending(false)
  }

  return (
    <section className="admin-card p-6 space-y-5">
      <div>
        <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-on-surface)' }}>
          Progress History
        </h2>
        <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
          Track weight and measurements over time so plan changes are based on history, not guesses.
        </p>
        {change !== null && (
          <p className="mt-2" style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800, color: 'var(--admin-primary-container)' }}>
            Total weight change: {change > 0 ? '+' : ''}{change.toFixed(1)} lb
          </p>
        )}
        {fatChange !== null && (
          <p className="mt-1" style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800, color: 'var(--admin-primary-container)' }}>
            Body fat change: {fatChange > 0 ? '+' : ''}{fatChange.toFixed(1)}%
          </p>
        )}
      </div>

      {message && <p role="status" style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-primary-container)' }}>{message}</p>}
      {error && <p role="alert" style={{ fontFamily: 'var(--font-hanken)', color: '#B42318' }}>{error}</p>}

      <form action={addLog} className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <label className="space-y-1">
          <span className="admin-label">Date</span>
          <input className="admin-input" name="loggedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="space-y-1">
          <span className="admin-label">Weight</span>
          <input className="admin-input" name="weight" placeholder="133 lb" />
        </label>
        <label className="space-y-1">
          <span className="admin-label">Body Fat</span>
          <input className="admin-input" name="bodyFat" placeholder="optional" />
        </label>
        <label className="space-y-1">
          <span className="admin-label">Waist</span>
          <input className="admin-input" name="waist" placeholder="optional" />
        </label>
        <label className="space-y-1">
          <span className="admin-label">Hips</span>
          <input className="admin-input" name="hips" placeholder="optional" />
        </label>
        <label className="space-y-1">
          <span className="admin-label">Notes</span>
          <input className="admin-input" name="notes" placeholder="check-in note" />
        </label>
        <button type="submit" className="admin-btn-secondary md:col-span-6" disabled={pending}>
          <Plus size={16} />
          {pending ? 'Saving...' : 'Add Progress Log'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-hanken)' }}>
          <thead>
            <tr style={{ color: 'var(--admin-on-surface-variant)' }}>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Weight</th>
              <th className="py-2 pr-4">Body Fat</th>
              <th className="py-2 pr-4">Waist</th>
              <th className="py-2 pr-4">Hips</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="py-4" colSpan={6} style={{ color: 'var(--admin-on-surface-variant)' }}>
                  No progress logs yet.
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
                <td className="py-3 pr-4">{log.logged_at}</td>
                <td className="py-3 pr-4">{log.weight || '-'}</td>
                <td className="py-3 pr-4">{log.body_fat || '-'}</td>
                <td className="py-3 pr-4">{log.waist || '-'}</td>
                <td className="py-3 pr-4">{log.hips || '-'}</td>
                <td className="py-3 pr-4">{log.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
