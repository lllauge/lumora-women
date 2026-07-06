import type { Metadata } from 'next'
import { Flame, Target, Sprout } from 'lucide-react'
import {
  getPortalContext, getDailyLogs, getLatestCoachReview, getCoachReviewCount,
  habitsFromPlan, currentStreak, weekConsistency, coachingToday, coachingWeekday,
  planWeekNumber,
} from '@/lib/coaching-engagement'
import DailyWins from '@/components/coaching/DailyWins'

export const metadata: Metadata = {
  title: 'Today | Lumora Women Coaching',
}

export default async function CoachingTodayPage() {
  const { firstName, client, plan, planPublishedAt, mealPlanStartDate } = await getPortalContext()
  const today = coachingToday()
  const [logs, review, reviewCount] = await Promise.all([
    getDailyLogs(client.id),
    getLatestCoachReview(client.id),
    getCoachReviewCount(client.id),
  ])
  const habits = habitsFromPlan(plan)
  const streak = currentStreak(logs, habits, today)
  const week = weekConsistency(logs, habits, today)
  // Anchor the week counter to the plan's start date when the coach set one;
  // updated_at moves on every save and would reset the count.
  const weekNum = planWeekNumber(mealPlanStartDate || planPublishedAt, today)
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

      {/* Coach's weekly review — the proof her coach read her week. Pinned
          above everything else until the next review replaces it. */}
      {review && (() => {
        const sections = [
          { title: 'What I saw', body: review.what_i_saw },
          { title: `What we're changing`, body: review.what_changed },
          { title: 'Your focus this week', body: review.focus },
        ].filter((s) => s.body.trim())
        if (sections.length === 0) return null
        const weekLabel = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' })
          .format(new Date(`${review.week_of}T12:00:00`))
        // Her only review so far is the post-onboarding welcome — label it
        // as one instead of anchoring it to a week she hasn't lived yet.
        const chipLabel = reviewCount === 1
          ? 'Welcome from your coach'
          : `From your coach · Week of ${weekLabel}`
        return (
          <section
            aria-label="Your coach's weekly review"
            style={{
              background: 'var(--section-tint)',
              border: '1px solid rgba(200,220,192,0.8)',
              borderLeft: '4px solid var(--botanical-green, #3F6936)',
              borderRadius: '1rem',
              padding: '1.125rem 1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: '#3F6936', marginBottom: '0.75rem' }}>
              <Sprout style={{ width: '0.9375rem', height: '0.9375rem' }} aria-hidden="true" />
              {chipLabel}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sections.map((section) => (
                <div key={section.title}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>
                    {section.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '0.875rem' }}>
              — Laura
            </p>
          </section>
        )
      })()}

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
