import type { Metadata } from 'next'
import Link from 'next/link'
import { Leaf, ShoppingBasket, UtensilsCrossed, CalendarDays, ChevronDown, Check, Dumbbell, PlayCircle } from 'lucide-react'
import {
  getPortalContext, todayMealDayIndex, clientVisibleRecipes, withGrams, displayRecipeName,
  getDailyLogs, coachingToday, cleanIngredientText, clientPortionFactor, clientPortionLines, isClientReadable, portionFraction,
  cleanMealDescription, portionSummaryLine, ingredientWeighState, groceryDisplay,
} from '@/lib/coaching-engagement'
import GroceryChecklist from '@/components/coaching/GroceryChecklist'
import InstructionSteps from '@/components/coaching/InstructionSteps'
import { mealRecipeNames, type CoachingPlanDraft } from '@/lib/coaching-plan-schema'

export const metadata: Metadata = {
  title: 'My Plan | Lumora Women Coaching',
}

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
    if (/^https?:\/\//i.test(savedUrl)) return savedUrl
    if (/^(www\.)?(youtube\.com|youtu\.be)\//i.test(savedUrl)) return `https://${savedUrl}`
    return savedUrl
  }

  const name = exercise.name.trim()
  if (!name) return ''
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise demo form`)}`
}

export default async function CoachingPlanPage() {
  const { client, plan } = await getPortalContext()
  const t = plan.macroTargets
  const todayIdx = todayMealDayIndex(plan)
  const visibleRecipes = clientVisibleRecipes(plan)
  const today = coachingToday()
  const todayLogs = await getDailyLogs(client.id, 7)
  const todayWins = todayLogs.find((l) => l.log_date === today)?.wins ?? {}

  const secondaryTargets = [
    t.water.trim() && { label: 'Water', value: t.water.trim(), winKey: 'water' },
    t.steps.trim() && { label: 'Steps', value: t.steps.trim(), winKey: 'steps' },
    t.workoutTarget.trim() && { label: 'Movement', value: t.workoutTarget.trim(), winKey: 'workout' },
  ].filter(Boolean) as { label: string; value: string; winKey?: string }[]

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
              return target.winKey ? (
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
      {plan.mealPlan.length > 0 && (
        <section aria-label="Weekly meal plan" style={{ marginBottom: '2.25rem' }}>
          <SectionHeader
            icon={<CalendarDays style={headerIcon} aria-hidden="true" />}
            title="Your Week"
            subtitle="Tap a day to see every meal."
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
            {plan.mealPlan.map((day, i) => (
              <details key={i} className="portal-details" open={i === todayIdx} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.3)' }}>
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
                  <DayMeals day={day} recipes={plan.recipes} />
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
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.625rem' }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {idx + 1}. {exercise.name || 'Exercise'}
                              </span>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: '#3F6936', flexShrink: 0, whiteSpace: 'nowrap' }}>
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

      {/* Recipes */}
      {visibleRecipes.length > 0 && (
        <section aria-label="Recipes" style={{ marginBottom: '2.25rem' }}>
          <SectionHeader
            icon={<UtensilsCrossed style={headerIcon} aria-hidden="true" />}
            title="Your Recipes"
            subtitle="Tap a recipe for your portion, ingredients, and steps."
          />
          <div className="portal-card">
            <div className="portal-gold-line" aria-hidden="true" />
            {visibleRecipes.map(({ recipe, index }, position) => (
              <details key={index} id={`recipe-${index}`} className="portal-details" style={{ borderTop: position === 0 ? 'none' : '1px solid rgba(200,220,192,0.3)' }}>
                <summary style={{
                  padding: '0.9375rem 1.25rem', minHeight: '52px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {displayRecipeName(recipe.name) || `Recipe ${index + 1}`}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {[
                        recipe.calories.trim() && `${recipe.calories.trim().replace(/\s*k?cal$/i, '')} cal`,
                        recipe.protein.trim() && `${withGrams(recipe.protein)} protein`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                    {recipe.mealType.trim() && (
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#3F6936', background: 'var(--section-tint)', borderRadius: '999px', padding: '0.25rem 0.625rem', textTransform: 'capitalize' }}>
                        {recipe.mealType.trim()}
                      </span>
                    )}
                    <ChevronDown className="portal-chevron" style={{ width: '1.125rem', height: '1.125rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
                  </span>
                </summary>
                <div style={{ padding: '0 1.25rem 1.25rem' }}>
                  <RecipeDetail recipe={recipe} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Grocery list */}
      {plan.groceryList.length > 0 && (
        <section aria-label="Grocery list">
          <SectionHeader
            icon={<ShoppingBasket style={headerIcon} aria-hidden="true" />}
            title="Grocery List"
            subtitle="Check items off as you shop, it remembers between visits."
          />
          <div className="portal-card">
            <div className="portal-gold-line" aria-hidden="true" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <GroceryChecklist
                items={plan.groceryList.map((item) => groceryDisplay(item))}
                storageKey={`lumora-grocery-${client.id}`}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function DayMeals({ day, recipes }: { day: CoachingPlanDraft['mealPlan'][number]; recipes: CoachingPlanDraft['recipes'] }) {
  const rows = [
    { slot: 'Breakfast', meal: day.breakfast },
    { slot: 'Lunch', meal: day.lunch },
    { slot: 'Dinner', meal: day.dinner },
    ...day.snacks.map((snack, i) => ({ slot: day.snacks.length > 1 ? `Snack ${i + 1}` : 'Snack', meal: snack })),
  ].filter((r) => r.meal.name.trim() || r.meal.description.trim())

  return (
    <div>
      {rows.map((row, i) => {
        const mealRecipes = mealRecipeNames(row.meal)
          .map((name) => ({ recipe: recipes.find((item) => item.name === name), name }))
          .filter((entry): entry is { recipe: CoachingPlanDraft['recipes'][number]; name: string } => Boolean(entry.recipe))
        const description = cleanMealDescription(row.meal.description)
        const displayName = mealRecipes.map(({ name }) => displayRecipeName(name)).filter(Boolean).join(' + ')
          || displayRecipeName(row.meal.name)
          || description
        return (
          <details
            key={i}
            style={{
              padding: '0.5rem 0',
              borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.25)',
            }}
          >
            <summary
              style={{
                listStyle: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.375rem 0',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: '#3F6936', marginBottom: '0.125rem' }}>
                  {row.slot}
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || '—'}
                </p>
                {row.meal.macros.trim() && (
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {row.meal.macros.trim()}
                  </p>
                )}
              </div>
              <span aria-hidden="true" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', flexShrink: 0 }}>▸</span>
            </summary>
            <div style={{ paddingTop: '0.5rem' }}>
            {row.meal.name.trim() && description && (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                {description}
              </p>
            )}
            {mealRecipes.map(({ recipe, name }) => {
              const recipeIndex = recipes.findIndex((item) => item.name === name)
              const recipeLabel = displayRecipeName(name)
              const isAutoCustom = /^Custom\s+/i.test(recipeLabel)
              return (
                <div key={name} style={{ marginTop: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--section-tint)', borderRadius: '0.625rem' }}>
                  {isAutoCustom ? (
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: '#3F6936' }}>{recipeLabel}</span>
                  ) : (
                    <Link href={recipeIndex >= 0 ? `#recipe-${recipeIndex}` : '#'} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: '#3F6936', textDecoration: 'none' }}>
                      {recipeLabel}
                    </Link>
                  )}
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {portionSummaryLine(recipe) || 'One listed serving'}
                    {recipe.calories.trim() ? ` · ${recipe.calories.replace(/\s*k?cal$/i, '')} cal` : ''}
                  </p>
                </div>
              )
            })}
            </div>
          </details>
        )
      })}
      {day.notes.trim() && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', paddingTop: '0.5rem' }}>
          {day.notes}
        </p>
      )}
    </div>
  )
}

function RecipeDetail({ recipe }: { recipe: CoachingPlanDraft['recipes'][number] }) {
  const sectionTitle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700,
    color: 'var(--text-primary)', margin: '1rem 0 0.375rem',
  }
  const bodyText: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6,
  }
  const isFamily = Number(recipe.familyServings) > 1
  const portionLines = clientPortionLines(recipe).filter((line) => line.grams !== null)
  const detailFraction = portionFraction(clientPortionFactor(recipe))
  // For family recipes the headline is "¼ of the recipe" (human-friendly),
  // with the gram total kept as small subtext. For individual recipes the
  // gram weight IS the meaningful headline, so we show it as before.
  const fractionHeadline = isFamily && detailFraction && detailFraction.label !== 'the whole recipe'
    ? `${detailFraction.qualifier ? `A ${detailFraction.qualifier} ${detailFraction.label}` : detailFraction.label} of the recipe`
    : ''
  const totalPortionGrams = portionLines.reduce((sum, line) => sum + (line.grams ?? 0), 0)
  const portionGramSubtext = fractionHeadline && totalPortionGrams > 0
    ? `about ${Math.round(totalPortionGrams)}g across the ingredient weights listed below`
    : ''
  const headline = fractionHeadline
    ? [] // fraction headline replaces the gram-based headline for family recipes
    : ([
        recipe.clientServingGrams.trim() && withGrams(recipe.clientServingGrams),
        isClientReadable(recipe.clientServingMeasure) && recipe.clientServingMeasure.trim(),
        isClientReadable(recipe.clientServing) && cleanIngredientText(recipe.clientServing),
      ].filter(Boolean) as string[])

  return (
    <div>
      {(headline.length > 0 || portionLines.length > 0 || fractionHeadline) && (
        <div style={{ background: 'var(--section-tint)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem', marginTop: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936', marginBottom: '0.125rem' }}>
            {isFamily ? 'YOUR PORTION (family recipe)' : 'YOUR PORTION'}
          </p>
          {fractionHeadline && (
            <>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.125rem 0 0.25rem' }}>
                {fractionHeadline}
              </p>
              {portionGramSubtext && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  {portionGramSubtext}
                </p>
              )}
            </>
          )}
          {headline.length > 0 && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {headline.join(' · ')}
            </p>
          )}
          {portionLines.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Weigh out your serving:
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {portionLines.map((line, i) => {
                  const amount = line.count ? line.count : line.grams !== null ? `${line.grams}g` : ''
                  return (
                    <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'baseline', padding: '0.1875rem 0' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '3.5rem', textAlign: 'right' }}>
                        {amount}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {line.name}
                        {!line.count && line.state === 'raw' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · weigh raw</span>
                        )}
                        {!line.count && line.state === 'cooked' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · weigh cooked</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                Tip: weigh each ingredient in the state it&apos;s listed, that&apos;s how your macros were calculated.
              </p>
            </div>
          )}
          {isClientReadable(recipe.clientServingBreakdown) && (
            <p style={{ ...bodyText, fontSize: '0.8125rem', marginTop: '0.375rem' }}>{cleanIngredientText(recipe.clientServingBreakdown)}</p>
          )}
          {(() => {
            const fraction = portionFraction(clientPortionFactor(recipe))
            if (!fraction) return null
            const serving = fraction.qualifier
              ? `a ${fraction.qualifier} ${fraction.label}`
              : `about ${fraction.label}`
            return (
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)',
                marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid rgba(200,220,192,0.6)',
              }}>
                <span style={{ fontWeight: 700, color: '#3F6936' }}>No scale? </span>
                {fraction.label === 'the whole recipe'
                  ? 'This whole recipe is your portion, enjoy all of it.'
                  : `Cook the full recipe, then serve yourself ${serving} of it${
                      fraction.qualifier === 'generous' ? ', a little over is right' : fraction.qualifier === 'scant' ? ', a little under is right' : ''
                    }. That division keeps the listed calories and macros on track.`}
              </p>
            )
          })()}
        </div>
      )}

      <p style={{ ...bodyText, marginTop: '0.75rem' }}>
        {[
          recipe.prepTime.trim() && `Prep ${recipe.prepTime.trim()}`,
          recipe.cookTime.trim() && `Cook ${recipe.cookTime.trim()}`,
          recipe.familyServings.trim() && isFamily && `Serves ${recipe.familyServings.trim()}`,
          [recipe.calories, recipe.protein, recipe.carbs, recipe.fats, recipe.fiber].some((v) => v.trim()) &&
            `Per portion: ${[
              recipe.calories.trim() && `${recipe.calories.trim().replace(/\s*k?cal$/i, '')} cal`,
              recipe.protein.trim() && `${recipe.protein.trim().replace(/\s*g$/i, '')}P`,
              recipe.carbs.trim() && `${recipe.carbs.trim().replace(/\s*g$/i, '')}C`,
              recipe.fats.trim() && `${recipe.fats.trim().replace(/\s*g$/i, '')}F`,
              recipe.fiber.trim() && `${recipe.fiber.trim().replace(/\s*g$/i, '')} fiber`,
            ].filter(Boolean).join(' / ')}`,
        ].filter(Boolean).join(' · ')}
      </p>

      {recipe.ingredients.length > 0 && (
        <>
          <h3 style={sectionTitle}>
            {isFamily ? 'Shopping & prep (full family recipe)' : 'Shopping & prep'}
          </h3>
          <p style={{ ...bodyText, fontSize: '0.8125rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            These are the amounts to buy and prep, most items are listed raw, since that&apos;s how the recipe was built.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {recipe.ingredients.map((ing, i) => {
              const state = ingredientWeighState(ing)
              return (
                <li key={i} style={{ ...bodyText, marginBottom: '0.25rem' }}>
                  {cleanIngredientText(ing)}
                  {state === 'raw' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · raw</span>
                  )}
                  {state === 'cooked' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · cooked weight</span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {recipe.instructions.length > 0 && (
        <>
          <h3 style={sectionTitle}>Instructions</h3>
          <p style={{ ...bodyText, fontSize: '0.8125rem', fontStyle: 'italic', marginBottom: '0.625rem' }}>
            Tap a step to check it off while you cook.
          </p>
          <InstructionSteps steps={recipe.instructions} />
        </>
      )}

      {recipe.swaps.length > 0 && (
        <>
          <h3 style={sectionTitle}>Easy swaps</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {recipe.swaps.map((swap, i) => (
              <li key={i} style={{ ...bodyText, marginBottom: '0.25rem' }}>{swap}</li>
            ))}
          </ul>
        </>
      )}

      {recipe.notes.trim() && (
        <p style={{ ...bodyText, marginTop: '0.75rem', fontStyle: 'italic' }}>{recipe.notes}</p>
      )}
    </div>
  )
}
