import type { Metadata } from 'next'
import { Flame, Target } from 'lucide-react'
import {
  getPortalContext, getDailyLogs, habitsFromPlan, currentStreak,
  weekConsistency, coachingToday, coachingWeekday, planWeekNumber,
} from '@/lib/coaching-engagement'
import DailyWins from '@/components/coaching/DailyWins'

export const metadata: Metadata = {
  title: 'Today | Lumora Women Coaching',
}

export default async function CoachingTodayPage() {
  const { firstName, client, plan, planPublishedAt } = await getPortalContext()
  const today = coachingToday()
  const logs = await getDailyLogs(client.id)
  const habits = habitsFromPlan(plan)
  const streak = currentStreak(logs, habits, today)
  const week = weekConsistency(logs, habits, today)
  const weekNum = planWeekNumber(planPublishedAt, today)
  const todayWins = logs.find((l) => l.log_date === today)?.wins ?? {}

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Good day, {firstName}.
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {coachingWeekday()} · Week {weekNum} of your plan
        </p>
      </div>

      {/* Streak + consistency */}
      <div className="portal-metric-grid" style={{ marginBottom: '1.75rem' }}>
        <div style={{ background: 'var(--section-sand)', borderRadius: '1rem', padding: '1rem 1.125rem' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#7A5505', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Flame style={{ width: '0.9375rem', height: '0.9375rem' }} aria-hidden="true" /> Streak
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div style={{ background: 'var(--section-tint)', borderRadius: '1rem', padding: '1rem 1.125rem' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#3F6936', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Target style={{ width: '0.9375rem', height: '0.9375rem' }} aria-hidden="true" /> This week
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {week.percent}% on track
          </p>
        </div>
      </div>

      <DailyWins habits={habits} initialWins={todayWins} logDate={today} />
    </div>
  )
}
