'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { NotebookPen, ChevronDown } from 'lucide-react'
import { submitCheckIn } from '@/app/actions/coaching-engagement'

export default function CheckInForm({ due }: { due: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitCheckIn(formData)
      if (!result.ok) {
        setError(result.error ?? 'Could not save your check-in.')
        return
      }
      setSubmitted(true)
      setOpen(false)
      router.refresh()
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
    border: '1px solid rgba(200,220,192,0.8)', background: '#FFFFFF',
    fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-primary)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
    fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem',
  }

  return (
    <div style={{ background: 'var(--section-tint)', borderRadius: '1rem', padding: '1rem 1.125rem' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <NotebookPen style={{ width: '1rem', height: '1rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
          <span>
            <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {submitted ? 'Check-in sent — nice work!' : due ? 'Weekly check-in due' : 'Weekly check-in'}
            </span>
            <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
              {submitted
                ? 'Laura will review your week and reply here.'
                : due
                  ? 'Weigh in and tell Laura how your week went.'
                  : 'Already done this week — you can still log an extra one.'}
            </span>
          </span>
        </span>
        <ChevronDown
          style={{
            width: '1.125rem', height: '1.125rem', color: 'var(--botanical-green)', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
          }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <form action={onSubmit} style={{ marginTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <div>
              <label htmlFor="checkin-weight" style={labelStyle}>Weight</label>
              <input id="checkin-weight" name="weight" maxLength={40} placeholder="e.g. 156 lb" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="checkin-waist" style={labelStyle}>Waist</label>
              <input id="checkin-waist" name="waist" maxLength={40} placeholder="optional" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="checkin-hips" style={labelStyle}>Hips</label>
              <input id="checkin-hips" name="hips" maxLength={40} placeholder="optional" style={inputStyle} />
            </div>
          </div>
          <label htmlFor="checkin-note" style={labelStyle}>How did this week feel?</label>
          <textarea
            id="checkin-note"
            name="note"
            rows={3}
            maxLength={1000}
            placeholder="Wins, struggles, anything Laura should know…"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          {error && (
            <p role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#A32D2D', marginTop: '0.5rem' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
            style={{ borderRadius: '0.5rem', padding: '0.625rem 1.5rem', marginTop: '0.75rem', opacity: pending ? 0.6 : 1 }}
          >
            {pending ? 'Sending…' : 'Send check-in'}
          </button>
        </form>
      )}
    </div>
  )
}
