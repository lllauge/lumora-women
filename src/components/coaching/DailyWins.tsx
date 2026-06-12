'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { toggleDailyWin } from '@/app/actions/coaching-engagement'
import type { Habit } from '@/lib/coaching-engagement'

export default function DailyWins({
  habits,
  initialWins,
  logDate,
}: {
  habits: Habit[]
  initialWins: Record<string, boolean>
  logDate: string
}) {
  const [wins, setWins] = useState(initialWins)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const doneCount = habits.filter((h) => wins[h.key]).length

  function toggle(habitKey: string) {
    const next = !wins[habitKey]
    setWins((prev) => ({ ...prev, [habitKey]: next }))
    setError(null)
    startTransition(async () => {
      const result = await toggleDailyWin({ habitKey, done: next, logDate })
      if (!result.ok) {
        setWins((prev) => ({ ...prev, [habitKey]: !next }))
        setError(result.error ?? 'Could not save. Please try again.')
      }
    })
  }

  return (
    <section aria-label="Today's wins">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Today&apos;s Wins
        </h2>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: doneCount === habits.length ? 'var(--botanical-green)' : 'var(--text-muted)' }}>
          {doneCount} of {habits.length}
        </span>
      </div>

      <div className="portal-card">
      <div className="portal-gold-line" aria-hidden="true" />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {habits.map((habit, i) => {
          const done = !!wins[habit.key]
          return (
            <li key={habit.key} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.3)' }}>
              <button
                type="button"
                onClick={() => toggle(habit.key)}
                aria-pressed={done}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.875rem 1.125rem', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', minHeight: '52px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '1.5rem', height: '1.5rem', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--botanical-green)' : '#FFFFFF',
                    border: done ? '1.5px solid var(--botanical-green)' : '1.5px solid var(--botanical-light)',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {done && <Check style={{ width: '0.875rem', height: '0.875rem', color: '#FFFFFF' }} />}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
                  color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: done ? 'line-through' : 'none',
                  textDecorationColor: 'rgba(90,107,88,0.5)',
                }}>
                  {habit.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      </div>

      {error && (
        <p role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#A32D2D', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
      {doneCount === habits.length && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--botanical-green)', fontWeight: 600, marginTop: '0.625rem' }}>
          All wins for today — beautifully done. 🌿
        </p>
      )}
    </section>
  )
}
