'use client'

import { useSyncExternalStore } from 'react'
import type { PrepLine } from '@/lib/household-measure'

// One shared preference across every recipe card, so a client who prefers
// cups doesn't have to re-toggle each meal. Modeled as a tiny external store
// over localStorage: every card on the page updates together, and the choice
// survives between visits.
const STORAGE_KEY = 'lumora-prep-units'

type Mode = 'grams' | 'easy'

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function readMode(): Mode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'easy' ? 'easy' : 'grams'
  } catch {
    return 'grams'
  }
}

function writeMode(next: Mode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch { /* preference just won't persist */ }
  listeners.forEach((listener) => listener())
}

export default function PrepIngredientList({ lines }: { lines: PrepLine[] }) {
  const mode = useSyncExternalStore(subscribe, readMode, () => 'grams' as Mode)

  const pill = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700,
    padding: '0.375rem 0.75rem', borderRadius: '999px', cursor: 'pointer',
    minHeight: '2rem',
    background: active ? 'var(--botanical-green)' : 'transparent',
    color: active ? '#FFFFFF' : '#3F6936',
    border: active ? '1px solid var(--botanical-green)' : '1px solid rgba(63,105,54,0.3)',
  })

  return (
    <div>
      <div
        role="group"
        aria-label="Ingredient measurement units"
        style={{ display: 'inline-flex', gap: '0.375rem', marginBottom: '0.625rem' }}
      >
        <button type="button" aria-pressed={mode === 'grams'} onClick={() => writeMode('grams')} style={pill(mode === 'grams')}>
          Grams (exact)
        </button>
        <button type="button" aria-pressed={mode === 'easy'} onClick={() => writeMode('easy')} style={pill(mode === 'easy')}>
          Cups &amp; spoons
        </button>
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {lines.map((line, i) => (
          <li
            key={i}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
              color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.25rem',
            }}
          >
            {mode === 'grams' ? line.grams : line.easy}
            {line.state === 'raw' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · raw</span>
            )}
            {line.state === 'cooked' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · cooked weight</span>
            )}
          </li>
        ))}
      </ul>
      {mode === 'easy' && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem', marginBottom: 0 }}>
          Cups and spoons are close approximations — plenty for everyday cooking.
          Switch to grams whenever you want to be exact.
        </p>
      )}
    </div>
  )
}
