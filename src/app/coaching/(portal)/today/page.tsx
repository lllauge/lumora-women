import type { Metadata } from 'next'
import Link from 'next/link'
import { Flame, Target, ChevronRight } from 'lucide-react'
import {
  getPortalContext, getDailyLogs, habitsFromPlan, currentStreak,
  weekConsistency, coachingToday, coachingWeekday, planWeekNumber, todayMealDayIndex,
  displayRecipeName, cleanMealDescription, portionSummaryLine,
} from '@/lib/coaching-engagement'
import DailyWins from '@/components/coaching/DailyWins'
import { mealRecipeNames, type CoachingPlanDraft } from '@/lib/coaching-plan-schema'

export const metadata: Metadata = {
  title: 'Today | Lumora Women Coaching',
}

type MealEntry = CoachingPlanDraft['mealPlan'][number]['breakfast']

export default async function CoachingTodayPage() {
  const { firstName, client, plan, planPublishedAt } = await getPortalContext()
  const today = coachingToday()
  const logs = await getDailyLogs(client.id)
  const habits = habitsFromPlan(plan)
  const streak = currentStreak(logs, habits, today)
  const week = weekConsistency(logs, habits, today)
  const weekNum = planWeekNumber(planPublishedAt, today)
  const todayWins = logs.find((l) => l.log_date === today)?.wins ?? {}

  const dayIndex = todayMealDayIndex(plan)
  const mealDay = dayIndex >= 0 ? plan.mealPlan[dayIndex] : null
  const recipeAnchor = (recipeName: string) => {
    if (/^Custom\s+/i.test(displayRecipeName(recipeName))) return '/coaching/plan'
    const idx = plan.recipes.findIndex((r) => r.name === recipeName)
    return idx >= 0 ? `/coaching/plan#recipe-${idx}` : '/coaching/plan'
  }
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

      <div style={{ marginBottom: '2rem' }}>
        <DailyWins habits={habits} initialWins={todayWins} logDate={today} />
      </div>

      {/* Today's meals */}
      <section aria-label="Today's meals">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Today&apos;s Meals
          </h2>
          <Link href="/coaching/plan" className="gold-text" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
            Full plan →
          </Link>
        </div>

        {!mealDay ? (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)', background: '#FFFFFF', borderRadius: '1rem', border: '1px solid rgba(200,220,192,0.35)', padding: '1.25rem' }}>
            Your meal plan is being prepared, check back soon.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <MealCard slot="Breakfast" meal={mealDay.breakfast} recipes={plan.recipes} anchor={recipeAnchor} />
            <MealCard slot="Lunch" meal={mealDay.lunch} recipes={plan.recipes} anchor={recipeAnchor} />
            <MealCard slot="Dinner" meal={mealDay.dinner} recipes={plan.recipes} anchor={recipeAnchor} />
            {mealDay.snacks.map((snack, i) => (
              <MealCard key={i} slot={mealDay.snacks.length > 1 ? `Snack ${i + 1}` : 'Snack'} meal={snack} recipes={plan.recipes} anchor={recipeAnchor} />
            ))}
            {mealDay.notes.trim() && (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                {mealDay.notes}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function MealCard({
  slot, meal, recipes, anchor,
}: {
  slot: string
  meal: MealEntry
  recipes: CoachingPlanDraft['recipes']
  anchor: (recipeName: string) => string
}) {
  if (!meal.name.trim() && !meal.description.trim()) return null
  const description = cleanMealDescription(meal.description)
  const names = mealRecipeNames(meal)
  const displayName = names.map(displayRecipeName).filter(Boolean).join(' + ')
    || displayRecipeName(meal.name)
    || description
  const weighOut = names.map((name) => {
    const recipe = recipes.find((item) => item.name === name)
    const portion = recipe ? portionSummaryLine(recipe) : ''
    return portion ? `${displayRecipeName(name)}: ${portion}` : ''
  }).filter(Boolean).join(' · ')
  const firstRecipeName = names[0] ?? ''
  const content = (
    <div style={{
      background: '#FFFFFF', borderRadius: '1rem', border: '1px solid rgba(200,220,192,0.35)',
      padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--botanical-green)', marginBottom: '0.125rem' }}>
          {slot}{meal.macros.trim() ? ` · ${meal.macros.trim()}` : ''}
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {displayName}
        </p>
        {meal.name.trim() && description && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
            {description}
          </p>
        )}
        {weighOut && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            <span style={{ fontWeight: 700, color: '#3F6936' }}>Your portion: </span>
            {weighOut}
          </p>
        )}
      </div>
      {firstRecipeName && (
        <ChevronRight style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
      )}
    </div>
  )

  return firstRecipeName ? (
    <Link
      href={anchor(firstRecipeName)}
      aria-label={`${slot}: ${displayName}, view recipes`}
      style={{ textDecoration: 'none' }}
    >
      {content}
    </Link>
  ) : content
}
