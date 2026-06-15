'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

export default function GroceryChecklist({ items, storageKey }: { items: string[]; storageKey: string }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setChecked(JSON.parse(raw))
    } catch { /* fresh list */ }
    setLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checked))
    } catch { /* storage full or blocked, checkboxes still work for the session */ }
  }, [checked, loaded, storageKey])

  const doneCount = items.filter((_, i) => checked[i]).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {doneCount} of {items.length} in the cart
        </span>
        {doneCount > 0 && (
          <button
            type="button"
            onClick={() => setChecked({})}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--botanical-green)', padding: '0.25rem' }}
          >
            Reset list
          </button>
        )}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, i) => {
          const done = !!checked[i]
          return (
            <li key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.3)' }}>
              <button
                type="button"
                onClick={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                aria-pressed={done}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.25rem', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', minHeight: '44px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '1.25rem', height: '1.25rem', borderRadius: '0.375rem', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--botanical-green)' : '#FFFFFF',
                    border: done ? '1.5px solid var(--botanical-green)' : '1.5px solid var(--botanical-light)',
                  }}
                >
                  {done && <Check style={{ width: '0.75rem', height: '0.75rem', color: '#FFFFFF' }} />}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
                  color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {item}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
