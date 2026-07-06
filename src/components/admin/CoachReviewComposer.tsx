'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCoachReview } from '@/app/actions/admin-reviews'

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--font-hanken)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--admin-on-surface-variant)',
  display: 'block',
  marginBottom: 4,
}

// The three-part weekly review Laura sends after reading a client's week.
// It lands pinned at the top of the client's Today page, so the copy here
// is written to her ("Your focus"), not about her.
export default function CoachReviewComposer({
  clientId,
  clientFirstName,
  weekLabel,
  initialReview,
  welcome = false,
}: {
  clientId: string
  clientFirstName: string
  weekLabel: string
  initialReview: { what_i_saw: string; what_changed: string; focus: string; updated_at: string } | null
  /** First-ever review: written after the onboarding call, framed as a welcome. */
  welcome?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const result = await saveCoachReview(formData)
      if (!result.ok) {
        setError(result.error ?? 'Could not save the review.')
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  const sections = [
    {
      name: 'whatISaw',
      label: 'What I saw',
      placeholder: welcome
        ? `e.g. From your onboarding and our call: you're busiest on weeknights, and protein has been the missing piece — your plan is built around both.`
        : `e.g. You hit protein 5 of 7 days and your weight trend is moving — the two days that slipped were both weekends.`,
      initial: initialReview?.what_i_saw ?? '',
    },
    {
      name: 'whatChanged',
      label: `What we're changing`,
      placeholder: welcome
        ? `e.g. Nothing yet — we start exactly as planned. Your meals, portions, and targets are all set for week one.`
        : `e.g. I moved more of your carbs to breakfast because your energy dipped mid-morning — your menu is updated.`,
      initial: initialReview?.what_changed ?? '',
    },
    {
      name: 'focus',
      label: 'Your focus this week',
      placeholder: welcome
        ? `e.g. Just follow the meals this week — don't chase perfect. I check your week every Monday and we adjust from there.`
        : `e.g. One thing only: protein at breakfast before coffee. Everything else is already working.`,
      initial: initialReview?.focus ?? '',
    },
  ]

  return (
    <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="hidden" name="clientId" value={clientId} />
      {sections.map((section) => (
        <label key={section.name}>
          <span style={fieldLabel}>{section.label}</span>
          <textarea
            className="admin-input"
            name={section.name}
            rows={2}
            maxLength={2000}
            defaultValue={section.initial}
            placeholder={section.placeholder}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-hanken)', fontSize: '0.9rem', lineHeight: 1.5 }}
          />
        </label>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" className="admin-btn-primary" disabled={pending}>
          {pending
            ? 'Saving…'
            : initialReview
              ? 'Update this week’s review'
              : welcome
                ? `Send ${clientFirstName}’s welcome`
                : `Send to ${clientFirstName}’s Today page`}
        </button>
        <span style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8rem', color: 'var(--admin-on-surface-variant)' }}>
          {welcome
            ? 'Greets her on her Today page from day one, until your first weekly review'
            : `${weekLabel} · pinned on her Today page until your next review`}
        </span>
      </div>
      {saved && !pending && (
        <p role="status" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.85rem', color: '#2e7d32', margin: 0 }}>
          Review saved — it&apos;s live on her Today page.
        </p>
      )}
      {error && (
        <p role="alert" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.85rem', color: '#A32D2D', margin: 0 }}>
          {error}
        </p>
      )}
    </form>
  )
}
