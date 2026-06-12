import type { Metadata } from 'next'
import Link from 'next/link'
import { Leaf, ShoppingBasket, UtensilsCrossed, CalendarDays, ChevronDown, Check } from 'lucide-react'
import {
  getPortalContext, todayMealDayIndex, clientVisibleRecipes, withGrams, displayRecipeName,
  getDailyLogs, coachingToday,
} from '@/lib/coaching-engagement'
import GroceryChecklist from '@/components/coaching/GroceryChecklist'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'

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
            subtitle="Your everyday habits — check them off on the Today tab."
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
                  aria-label={`${target.label} target ${target.value}${doneToday ? ' — done today' : ''} — open Today's wins`}
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
                  <DayMeals day={day} />
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
            subtitle="Check items off as you shop — it remembers between visits."
          />
          <div className="portal-card">
            <div className="portal-gold-line" aria-hidden="true" />
            <div style={{ padding: '1rem 1.25rem' }}>
              <GroceryChecklist items={plan.groceryList} storageKey={`lumora-grocery-${client.id}`} />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function DayMeals({ day }: { day: CoachingPlanDraft['mealPlan'][number] }) {
  const rows = [
    { slot: 'Breakfast', meal: day.breakfast },
    { slot: 'Lunch', meal: day.lunch },
    { slot: 'Dinner', meal: day.dinner },
    ...day.snacks.map((snack, i) => ({ slot: day.snacks.length > 1 ? `Snack ${i + 1}` : 'Snack', meal: snack })),
  ].filter((r) => r.meal.name.trim() || r.meal.description.trim())

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} style={{ padding: '0.75rem 0', borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.25)' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: '#3F6936', marginBottom: '0.125rem' }}>
            {row.slot}{row.meal.macros.trim() ? ` · ${row.meal.macros.trim()}` : ''}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {displayRecipeName(row.meal.name) || row.meal.description.trim()}
          </p>
          {row.meal.name.trim() && row.meal.description.trim() && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
              {row.meal.description}
            </p>
          )}
        </div>
      ))}
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

  return (
    <div>
      {(recipe.clientServing.trim() || recipe.clientServingGrams.trim()) && (
        <div style={{ background: 'var(--section-tint)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem', marginTop: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936', marginBottom: '0.125rem' }}>
            {isFamily ? 'YOUR PORTION (family recipe)' : 'YOUR PORTION'}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {[
              recipe.clientServing.trim(),
              recipe.clientServingGrams.trim() && `${recipe.clientServingGrams.trim()}g`,
              recipe.clientServingMeasure.trim(),
            ].filter(Boolean).join(' · ')}
          </p>
          {recipe.clientServingBreakdown.trim() && (
            <p style={{ ...bodyText, fontSize: '0.8125rem', marginTop: '0.25rem' }}>{recipe.clientServingBreakdown}</p>
          )}
        </div>
      )}

      <p style={{ ...bodyText, marginTop: '0.75rem' }}>
        {[
          recipe.prepTime.trim() && `Prep ${recipe.prepTime.trim()}`,
          recipe.cookTime.trim() && `Cook ${recipe.cookTime.trim()}`,
          recipe.familyServings.trim() && isFamily && `Serves ${recipe.familyServings.trim()}`,
          [recipe.calories, recipe.protein, recipe.carbs, recipe.fats].some((v) => v.trim()) &&
            `Per portion: ${[
              recipe.calories.trim() && `${recipe.calories.trim().replace(/\s*k?cal$/i, '')} cal`,
              recipe.protein.trim() && `${recipe.protein.trim().replace(/\s*g$/i, '')}P`,
              recipe.carbs.trim() && `${recipe.carbs.trim().replace(/\s*g$/i, '')}C`,
              recipe.fats.trim() && `${recipe.fats.trim().replace(/\s*g$/i, '')}F`,
            ].filter(Boolean).join(' / ')}`,
        ].filter(Boolean).join(' · ')}
      </p>

      {recipe.ingredients.length > 0 && (
        <>
          <h3 style={sectionTitle}>Ingredients</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ ...bodyText, marginBottom: '0.25rem' }}>{ing}</li>
            ))}
          </ul>
        </>
      )}

      {recipe.instructions.length > 0 && (
        <>
          <h3 style={sectionTitle}>Instructions</h3>
          <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {recipe.instructions.map((step, i) => (
              <li key={i} style={{ ...bodyText, marginBottom: '0.375rem' }}>{step}</li>
            ))}
          </ol>
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
