// The client's My Plan page body, shared between the portal route (she views
// her own plan) and the admin preview route (Laura views a client's portal
// exactly as the client sees it, read-only). Server component: fetches the
// client's daily wins itself.
import Link from 'next/link'
import { Leaf, ShoppingBasket, CalendarDays, ChevronDown, Check, Dumbbell, PlayCircle } from 'lucide-react'
import {
  todayMealDayIndex, withGrams,
  getDailyLogs, coachingToday, groceryDisplay,
} from '@/lib/coaching-engagement'
import GroceryChecklist from '@/components/coaching/GroceryChecklist'
import { buildGroceryList, clientGroceryList } from '@/lib/grocery-list'
import { familyPrepBadges, mealPrepBadges } from '@/lib/cooking-style'
import { mealPlanBlocks, mealPlanSchedule, friendlyBlockDate } from '@/lib/meal-plan-schedule'
import DayMeals from '@/components/coaching/DayMeals'
import { type CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import { ymoveVideoHref } from '@/lib/ymove-exercises'

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {icon}
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

const headerIcon: React.CSSProperties = { width: '1rem', height: '1rem', color: 'var(--botanical-green)' }

function exerciseDemoHref(exercise: CoachingPlanDraft['workoutPlan'][number]['exercises'][number]) {
  const savedUrl = exercise.videoUrl.trim()
  if (savedUrl) {
    const ymoveHref = ymoveVideoHref(savedUrl)
    if (ymoveHref) return ymoveHref
    if (/^https?:\/\//i.test(savedUrl)) return savedUrl
    // Saved links are pasted by hand and often arrive without a protocol
    // ("vimeo.com/123"). Rendered as-is they'd become relative links under
    // /coaching/… and 404. Anything domain-shaped gets https://; anything
    // else falls through to the YouTube search below.
    if (/^(www\.)?[\w-]+(\.[\w-]+)+(\/|$)/i.test(savedUrl)) return `https://${savedUrl}`
  }

  const name = exercise.name.trim()
  if (!name) return ''
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise demo form`)}`
}

export default async function ClientPlanView({
  client,
  plan,
  individualPlanStyle,
  freshCookStyle = false,
  familyPrepStyle = false,
  mealPlanStartDate,
  selectedDayIndex = NaN,
  selectedMealIndex = NaN,
  selectedRecipeIndex = NaN,
  previewMode = false,
}: {
  client: { id: string }
  plan: CoachingPlanDraft
  individualPlanStyle: boolean
  /** Solo client who cooks fresh each time instead of batching leftovers. */
  freshCookStyle?: boolean
  /** Family plan where repeated dinners are double-batched, not re-cooked. */
  familyPrepStyle?: boolean
  mealPlanStartDate: string
  selectedDayIndex?: number
  selectedMealIndex?: number
  selectedRecipeIndex?: number
  /** Admin "view as client": target cards don't link into the client portal. */
  previewMode?: boolean
}) {
  const t = plan.macroTargets
  const today = coachingToday()
  const todayLogs = await getDailyLogs(client.id, 7)
  const todayWins = todayLogs.find((l) => l.log_date === today)?.wins ?? {}

  // Long plans release two weeks at a time: the client sees the current
  // 14-day block, and the next block (plus its grocery list) unlocks two
  // days early so she can shop before the switch.
  const schedule = mealPlanSchedule(plan.mealPlan.length, mealPlanStartDate, today)
  const blocks = mealPlanBlocks(plan.mealPlan.length)
  const todayIdx = schedule.active ? schedule.todayDayIndex : todayMealDayIndex(plan)
  const allDays = plan.mealPlan.map((day, index) => ({ day, index }))
  const currentDays = schedule.active
    ? allDays.slice(blocks[schedule.currentBlock].start, blocks[schedule.currentBlock].end)
    : allDays
  const nextDays = schedule.active && schedule.nextBlockVisible
    ? allDays.slice(blocks[schedule.currentBlock + 1].start, blocks[schedule.currentBlock + 1].end)
    : []
  const nextBlockDate = friendlyBlockDate(schedule.nextBlockStartsOn)
  // A single 7-day menu is still eaten for two weeks in Laura's program —
  // present it with the same two-week framing the scheduled 14-day blocks
  // get, instead of downgrading the client to "Your Week".
  const twoWeekMenu = schedule.active || allDays.length <= 7

  const secondaryTargets = [
    t.water.trim() && { label: 'Water', value: t.water.trim(), winKey: 'water' },
    t.steps.trim() && { label: 'Steps', value: t.steps.trim(), winKey: 'steps' },
    t.workoutTarget.trim() && { label: 'Movement', value: t.workoutTarget.trim(), winKey: 'workout' },
  ].filter(Boolean) as { label: string; value: string; winKey?: string }[]

  // Derived fresh from the meal plan's recipes on every render, so the
  // master list stays complete even when the stored plan.groceryList is
  // stale from an older save. When the two-week schedule is active, each
  // block gets its own list covering just those days.
  const groceryOptions = { soloClient: individualPlanStyle, freshCook: freshCookStyle }
  const groceryItems = clientGroceryList(
    schedule.active ? { ...plan, mealPlan: currentDays.map(({ day }) => day) } : plan,
    groceryOptions,
  )
  const nextGroceryItems = nextDays.length > 0
    ? buildGroceryList({ ...plan, mealPlan: nextDays.map(({ day }) => day) }, groceryOptions)
    : []

  // Cook-day / leftover badges for solo meal-prep menus, and double-batch /
  // reheat badges for family meal-prep menus — computed per visible menu so
  // they always agree with that menu's grocery list.
  const batchStyle = individualPlanStyle && !freshCookStyle
  const badgesFor = (days: typeof currentDays) => batchStyle
    ? mealPrepBadges(days, plan.recipes)
    : familyPrepStyle
      ? familyPrepBadges(days)
      : new Map()
  const prepBadges = badgesFor(currentDays)
  const nextPrepBadges = nextDays.length > 0 ? badgesFor(nextDays) : new Map()
  const groceryStorageKey = schedule.active
    ? `lumora-grocery-${client.id}-b${schedule.currentBlock}`
    : `lumora-grocery-${client.id}`

  const macros = [
    t.protein.trim() && { label: 'Protein', value: withGrams(t.protein) },
    t.carbs.trim() && { label: 'Carbs', value: withGrams(t.carbs) },
    t.fats.trim() && { label: 'Fats', value: withGrams(t.fats) },
    t.fiber.trim() && { label: 'Fiber', value: withGrams(t.fiber) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
        My Plan
      </h1>

      {/* Note from Laura */}
      {plan.clientNotes.trim() && (
        <div style={{ background: 'var(--section-tint)', borderRadius: '1rem', padding: '1.125rem 1.25rem', marginBottom: '2rem' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: '#3F6936', marginBottom: '0.375rem' }}>
            <Leaf style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true" /> A note from Laura
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {plan.clientNotes.trim()}
          </p>
        </div>
      )}

      {/* Daily targets */}
      {(t.calories.trim() || secondaryTargets.length > 0) && (
        <section aria-label="Daily targets" style={{ marginBottom: '2.25rem' }}>
          <SectionHeader
            icon={<Leaf style={headerIcon} aria-hidden="true" />}
            title="Your Daily Targets"
            subtitle="Your everyday habits, check them off on the Today tab."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.625rem' }}>
            {t.calories.trim() && (
              <div style={{ background: 'var(--section-sand)', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: '#7A5505', marginBottom: '0.125rem' }}>Calories</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.calories.trim()}</p>
              </div>
            )}
            {secondaryTargets.map((target) => {
              const doneToday = !!(target.winKey && todayWins[target.winKey])
              const card = (
                <div style={{ background: 'var(--section-tint)', borderRadius: '0.875rem', padding: '0.875rem 1rem', height: '100%' }}>
                  <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: '#3F6936', marginBottom: '0.125rem' }}>
                    {target.label}
                    {doneToday && (
                      <span
                        aria-label="done today"
                        style={{
                          width: '1.125rem', height: '1.125rem', borderRadius: '50%', flexShrink: 0,
                          background: 'var(--botanical-green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Check style={{ width: '0.6875rem', height: '0.6875rem', color: '#FFFFFF' }} aria-hidden="true" />
                      </span>
                    )}
                  </p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: target.value.length > 10 ? '0.9375rem' : '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                    {target.value}
                  </p>
                </div>
              )
              return target.winKey && !previewMode ? (
                <Link
                  key={target.label}
                  href="/coaching/today"
                  aria-label={`${target.label} target ${target.value}${doneToday ? ', done today' : ''}, open Today's wins`}
                  style={{ textDecoration: 'none' }}
                >
                  {card}
                </Link>
              ) : (
                <div key={target.label}>{card}</div>
              )
            })}
          </div>
        </section>
      )}

      {/* Weekly meal plan */}
      {currentDays.length > 0 && (
        <section aria-label="Weekly meal plan" style={{ marginBottom: '2.25rem' }}>
          <SectionHeader
            icon={<CalendarDays style={headerIcon} aria-hidden="true" />}
            title={twoWeekMenu ? 'Your 2 Weeks' : 'Your Week'}
            subtitle={twoWeekMenu
              ? 'Your menu for these two weeks — repeat it both weeks. Tap a day to see every meal.'
              : 'Tap a day to see every meal.'}
          />
          <div className="portal-card">
            <div className="portal-gold-line" aria-hidden="true" />
            {macros.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.375rem 1.25rem',
                background: 'var(--section-tint)', padding: '0.75rem 1.25rem',
                borderBottom: '1px solid rgba(200,220,192,0.3)',
              }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936' }}>
                  YOUR DAILY MACROS
                </span>
                {macros.map((macro) => (
                  <span key={macro.label} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{macro.label} </span>
                    <span style={{ fontWeight: 700 }}>{macro.value}</span>
                  </span>
                ))}
              </div>
            )}
            {currentDays.map(({ day, index: i }, pos) => (
              <details
                key={i}
                id={`day-${i}`}
                className="portal-details"
                open={i === todayIdx || i === selectedDayIndex}
                style={{ borderTop: pos === 0 ? 'none' : '1px solid rgba(200,220,192,0.3)' }}
              >
                <summary style={{
                  padding: '0.9375rem 1.25rem', minHeight: '52px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {day.day.trim() || `Day ${i + 1}`}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    {i === todayIdx && (
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#7A5505', background: 'var(--section-sand)', borderRadius: '999px', padding: '0.25rem 0.625rem' }}>
                        TODAY
                      </span>
                    )}
                    <ChevronDown className="portal-chevron" style={{ width: '1.125rem', height: '1.125rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
                  </span>
                </summary>
                <div style={{ padding: '0.25rem 1.25rem 1rem' }}>
                  <DayMeals
                    day={day}
                    dayIndex={i}
                    recipes={plan.recipes}
                    individualPlanStyle={individualPlanStyle}
                    freshCook={freshCookStyle}
                    prepBadges={prepBadges}
                    selectedMealIndex={i === selectedDayIndex ? selectedMealIndex : -1}
                    selectedRecipeIndex={i === selectedDayIndex ? selectedRecipeIndex : -1}
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Weekly workouts */}
      {plan.workoutPlan.length > 0 && (
        <section aria-label="Weekly workouts" style={{ marginBottom: '2.25rem' }}>
          <SectionHeader
            icon={<Dumbbell style={headerIcon} aria-hidden="true" />}
            title="Your Workouts"
            subtitle="A starting point. Follow as-is, modify with your trainer, or swap days as your week needs."
          />
          <div className="portal-card">
            <div className="portal-gold-line" aria-hidden="true" />
            {plan.workoutPlan.map((day, i) => (
              <details key={i} className="portal-details" open={i === 0} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.3)' }}>
                <summary style={{
                  padding: '0.9375rem 1.25rem', minHeight: '52px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {day.day.trim() || `Day ${i + 1}`}
                    </span>
                    {day.exercises.length > 0 && (
                      <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                        {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="portal-chevron" style={{ width: '1.125rem', height: '1.125rem', color: 'var(--botanical-green)', flexShrink: 0 }} aria-hidden="true" />
                </summary>
                <div style={{ padding: '0.25rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {day.warmup.trim() && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#3F6936', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                        Warm-up
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>
                        {day.warmup.trim()}
                      </p>
                    </div>
                  )}
                  {day.exercises.length > 0 && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#3F6936', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                        Exercises
                      </p>
                      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {day.exercises.map((exercise, idx) => (
                          <li key={idx} style={{ background: 'var(--section-tint)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem' }}>
                            {/* flexWrap: a long exercise name next to nowrap
                                sets/reps text must drop to a second line, not
                                push the page wider than the phone screen. */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.25rem 0.625rem' }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {idx + 1}. {exercise.name || 'Exercise'}
                              </span>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: '#3F6936' }}>
                                {[exercise.sets, exercise.reps].filter(Boolean).join(' × ')}
                                {exercise.rest.trim() && (
                                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · rest {exercise.rest.trim()}</span>
                                )}
                              </span>
                            </div>
                            {exerciseDemoHref(exercise) && (
                              <a
                                href={exerciseDemoHref(exercise)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                  minHeight: '2rem', marginTop: '0.5rem', padding: '0.375rem 0.625rem',
                                  borderRadius: '999px', background: '#FFFFFF', border: '1px solid rgba(63,105,54,0.18)',
                                  fontFamily: 'var(--font-sans)', fontSize: '0.78125rem', fontWeight: 700,
                                  color: '#3F6936', textDecoration: 'none',
                                }}
                                aria-label={`Watch demo video for ${exercise.name || 'this exercise'}`}
                              >
                                <PlayCircle style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true" />
                                Watch demo
                              </a>
                            )}
                            {exercise.notes.trim() && (
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '0.25rem', marginBottom: 0 }}>
                                {exercise.notes.trim()}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {day.cardio.trim() && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#3F6936', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                        Cardio
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>
                        {day.cardio.trim()}
                      </p>
                    </div>
                  )}
                  {day.cooldown.trim() && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#3F6936', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                        Cool-down
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>
                        {day.cooldown.trim()}
                      </p>
                    </div>
                  )}
                  {day.notes.trim() && (
                    <div style={{ background: 'var(--section-sand)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem' }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>
                        {day.notes.trim()}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Grocery list */}
      {groceryItems.length > 0 && (
        <section aria-label="Grocery list">
          <SectionHeader
            icon={<ShoppingBasket style={headerIcon} aria-hidden="true" />}
            title="Grocery List"
            subtitle={[
              twoWeekMenu
                ? 'One week of your menu — shop it each week. Check items off as you go, it remembers between visits.'
                : 'Check items off as you shop, it remembers between visits.',
              // The list buys batches (or exact portions), not meal slots —
              // without this line a menu that repeats a recipe looks
              // under-shopped to the client.
              freshCookStyle
                ? 'Amounts are scaled to your portions — you cook fresh each time, so this buys exactly what you\'ll eat.'
                : individualPlanStyle
                  ? 'Meals that repeat during the week come from one batch, so this buys just what you need.'
                  : familyPrepStyle
                    ? 'Repeated dinners are double-batched — this buys enough for every night, you just cook once.'
                    : '',
            ].filter(Boolean).join(' ')}
          />
          <div className="portal-card">
            <div className="portal-gold-line" aria-hidden="true" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <GroceryChecklist
                items={groceryItems.map((item) => groceryDisplay(item))}
                storageKey={groceryStorageKey}
              />
            </div>
          </div>
        </section>
      )}

      {/* Next two weeks, unlocked shortly before they start so she can shop ahead */}
      {nextDays.length > 0 && (
        <section aria-label="Your next two weeks" style={{ marginTop: '2.25rem' }}>
          <SectionHeader
            icon={<CalendarDays style={headerIcon} aria-hidden="true" />}
            title="Coming Up: Your Next 2 Weeks"
            subtitle={`Starting ${nextBlockDate} — here's what's ahead so you can shop and meal prep before the switch.`}
          />
          <div className="portal-card" style={{ marginBottom: '1.25rem' }}>
            <div className="portal-gold-line" aria-hidden="true" />
            {nextDays.map(({ day, index: i }, pos) => (
              <details
                key={i}
                id={`day-${i}`}
                className="portal-details"
                open={i === selectedDayIndex}
                style={{ borderTop: pos === 0 ? 'none' : '1px solid rgba(200,220,192,0.3)' }}
              >
                <summary style={{
                  padding: '0.9375rem 1.25rem', minHeight: '52px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {day.day.trim() || `Day ${i + 1}`}
                  </span>
                  <ChevronDown className="portal-chevron" style={{ width: '1.125rem', height: '1.125rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
                </summary>
                <div style={{ padding: '0.25rem 1.25rem 1rem' }}>
                  <DayMeals
                    day={day}
                    dayIndex={i}
                    recipes={plan.recipes}
                    individualPlanStyle={individualPlanStyle}
                    freshCook={freshCookStyle}
                    prepBadges={nextPrepBadges}
                    selectedMealIndex={i === selectedDayIndex ? selectedMealIndex : -1}
                    selectedRecipeIndex={i === selectedDayIndex ? selectedRecipeIndex : -1}
                  />
                </div>
              </details>
            ))}
          </div>
          {nextGroceryItems.length > 0 && (
            <>
              <SectionHeader
                icon={<ShoppingBasket style={headerIcon} aria-hidden="true" />}
                title="Grocery List for the Next 2 Weeks"
                subtitle="One week's shopping for your new menu — grab it before day one."
              />
              <div className="portal-card">
                <div className="portal-gold-line" aria-hidden="true" />
                <div style={{ padding: '1rem 1.25rem' }}>
                  <GroceryChecklist
                    items={nextGroceryItems.map((item) => groceryDisplay(item))}
                    storageKey={`lumora-grocery-${client.id}-b${schedule.currentBlock + 1}`}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
