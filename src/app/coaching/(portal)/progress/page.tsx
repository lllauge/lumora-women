import type { Metadata } from 'next'
import Link from 'next/link'
import { Sprout, Flame, NotebookPen, CalendarDays, Lock, Scale } from 'lucide-react'
import {
  getPortalContext, getDailyLogs, getProgressLogs, getCheckInCount,
  habitsFromPlan, currentStreak, weekConsistency, milestones, coachingToday,
} from '@/lib/coaching-engagement'

export const metadata: Metadata = {
  title: 'Progress | Lumora Women Coaching',
}

const MILESTONE_ICONS = {
  'first-week': Sprout,
  'streak-7': Flame,
  'check-ins-4': NotebookPen,
  'days-30': CalendarDays,
} as const

export default async function CoachingProgressPage() {
  const { client, plan } = await getPortalContext()
  const today = coachingToday()
  const [logs, progressLogs, checkInCount] = await Promise.all([
    getDailyLogs(client.id),
    getProgressLogs(client.id),
    getCheckInCount(client.id),
  ])

  const habits = habitsFromPlan(plan)
  const streak = currentStreak(logs, habits, today)
  const week = weekConsistency(logs, habits, today)
  const stones = milestones(logs, habits, checkInCount)

  const weights = progressLogs
    .map((l) => ({ date: l.logged_at, value: parseFloat((l.weight ?? '').replace(/[^\d.]/g, '')) }))
    .filter((w) => Number.isFinite(w.value) && w.value > 0)
  const weightChange = weights.length >= 2 ? weights[weights.length - 1].value - weights[0].value : null

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const recentLogs = [...progressLogs].reverse().slice(0, 6)

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Your Progress
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Consistency beats perfection.
        </p>
      </div>

      {/* This week */}
      <section aria-label="This week" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            This Week
          </h2>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--botanical-green)' }}>
            {week.percent}% on track
          </span>
        </div>
        <div className="portal-week-grid">
          {week.days.map((day, i) => {
            const future = day.date > today
            const full = day.possible > 0 && day.wins >= Math.max(1, Math.ceil(day.possible * 0.8))
            const partial = day.wins > 0 && !full
            return (
              <div key={day.date} style={{ textAlign: 'center' }}>
                <div
                  role="img"
                  aria-label={`${day.date}: ${future ? 'upcoming' : `${day.wins} of ${day.possible} wins`}`}
                  style={{
                    height: '2.5rem', borderRadius: '0.625rem',
                    background: future ? '#FFFFFF' : full ? 'var(--botanical-green)' : partial ? 'var(--botanical-light)' : 'var(--section-tint)',
                    border: future ? '1.5px dashed var(--botanical-light)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700,
                    color: full ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {!future && day.wins > 0 ? day.wins : ''}
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }} aria-hidden="true">
                  {dayLabels[i]}
                </p>
              </div>
            )
          })}
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          Solid green = strong day · light green = partial · number = wins logged
        </p>
      </section>

      {/* Streak + totals */}
      <div className="portal-metric-grid" style={{ marginBottom: '2rem' }}>
        <div style={{ background: 'var(--section-sand)', borderRadius: '1rem', padding: '1rem 1.125rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#7A5505', fontWeight: 600, marginBottom: '0.25rem' }}>Current streak</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div style={{ background: 'var(--section-tint)', borderRadius: '1rem', padding: '1rem 1.125rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#3F6936', fontWeight: 600, marginBottom: '0.25rem' }}>Check-ins completed</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {checkInCount}
          </p>
        </div>
      </div>

      {/* Milestones */}
      <section aria-label="Milestones" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Milestones
        </h2>
        <div className="portal-milestone-grid">
          {stones.map((stone) => {
            const Icon = stone.earned
              ? MILESTONE_ICONS[stone.key as keyof typeof MILESTONE_ICONS] ?? Sprout
              : Lock
            return (
              <div
                key={stone.key}
                style={{
                  background: stone.earned ? 'var(--section-tint)' : '#FFFFFF',
                  border: stone.earned ? 'none' : '1px solid rgba(200,220,192,0.35)',
                  borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center',
                }}
              >
                <Icon
                  style={{ width: '1.25rem', height: '1.25rem', color: stone.earned ? 'var(--botanical-green)' : 'var(--text-muted)' }}
                  aria-hidden="true"
                />
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600,
                  color: stone.earned ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '0.375rem',
                }}>
                  {stone.label}
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: stone.earned ? '#3F6936' : 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {stone.earned ? 'Earned' : 'In progress'}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trend */}
      <section aria-label="Measurements">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          <Scale style={{ width: '1rem', height: '1rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
          Your Trend
        </h2>

        {weights.length < 2 && recentLogs.length === 0 ? (
          <div className="portal-card" style={{ textAlign: 'center' }}>
            <div className="portal-gold-line" aria-hidden="true" />
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Your trend will appear here after your first couple of check-ins.
              </p>
              <Link href="/coaching/coach" className="btn-primary" style={{ borderRadius: '0.5rem', padding: '0.625rem 1.25rem', display: 'inline-block' }}>
                Do your first check-in
              </Link>
            </div>
          </div>
        ) : (
          <div className="portal-card">
            <div className="portal-gold-line" aria-hidden="true" />
            <div style={{ padding: '1.125rem 1.25rem' }}>
            {weightChange !== null && (
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Weight</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: weightChange <= 0 ? 'var(--botanical-green)' : 'var(--text-secondary)' }}>
                  {weightChange <= 0 ? '−' : '+'}{Math.abs(weightChange).toFixed(1)} since start
                </span>
              </div>
            )}
            {weights.length >= 2 && <WeightSparkline points={weights.map((w) => w.value)} />}

            {recentLogs.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                {recentLogs.map((log, i) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0', borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.25)' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', flexShrink: 0 }}>{log.logged_at}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-primary)', textAlign: 'right' }}>
                      {[
                        log.weight && `Weight ${log.weight}`,
                        log.waist && `Waist ${log.waist}`,
                        log.hips && `Hips ${log.hips}`,
                      ].filter(Boolean).join(' · ') || (log.notes ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function WeightSparkline({ points }: { points: number[] }) {
  const w = 560
  const h = 80
  const pad = 6
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const coords = points.map((value, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (value - min) / range) * (h - pad * 2)
    return { x, y }
  })
  const path = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const last = coords[coords.length - 1]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={`Weight trend from ${points[0]} to ${points[points.length - 1]}`}
    >
      <polyline points={path} fill="none" stroke="var(--botanical-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4" fill="var(--botanical-green)" />
    </svg>
  )
}
