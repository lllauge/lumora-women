'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

type Props = {
  steps: string[]
}

// Recipe instructions rendered as a step-by-step cooking list. Each step is
// tappable to mark complete while cooking — state lives only in the component
// since this is a per-session aid, not a logged habit.
export default function InstructionSteps({ steps }: Props) {
  const [done, setDone] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setDone((current) => {
      const next = new Set(current)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {steps.map((step, i) => {
        const isDone = done.has(i)
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={isDone}
              aria-label={isDone ? `Step ${i + 1}, completed` : `Step ${i + 1}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.875rem',
                padding: '0.875rem 1rem',
                background: isDone ? 'rgba(76, 124, 73, 0.06)' : 'var(--card-surface, #FFFFFF)',
                border: `1px solid ${isDone ? 'rgba(76, 124, 73, 0.25)' : 'var(--border-subtle, #E8E4DA)'}`,
                borderRadius: '0.75rem',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'background 120ms ease, border-color 120ms ease',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: isDone ? 'var(--botanical-green, #4C7C49)' : 'var(--section-tint, #EFF3E8)',
                  color: isDone ? '#FFFFFF' : 'var(--botanical-green, #4C7C49)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  marginTop: '0.125rem',
                }}
              >
                {isDone ? <Check style={{ width: '0.875rem', height: '0.875rem' }} /> : i + 1}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.55,
                  color: 'var(--text-primary, #2A2A2A)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  opacity: isDone ? 0.6 : 1,
                }}
              >
                {step}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
