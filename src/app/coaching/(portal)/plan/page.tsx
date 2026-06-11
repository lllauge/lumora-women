import type { Metadata } from 'next'
import { Leaf, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
import { getPortalContext, todayMealDayIndex, clientVisibleRecipes, withGrams } from '@/lib/coaching-engagement'
import GroceryChecklist from '@/components/coaching/GroceryChecklist'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'

export const metadata: Metadata = {
  title: 'My Plan | Lumora Women Coaching',
}

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: '1rem',
  border: '1px solid rgba(200,220,192,0.35)', overflow: 'hidden',
}

export default async function CoachingPlanPage() {
  const { client, plan } = await getPortalContext()
  const t = plan.macroTargets
  const todayIdx = todayMealDayIndex(plan)
  const visibleRecipes = clientVisibleRecipes(plan)

  const targets = [
    t.calories.trim() && { label: 'Calories', value: t.calories.trim() },
    t.protein.trim() && { label: 'Protein', value: withGrams(t.protein) },
    t.carbs.trim() && { label: 'Carbs', value: withGrams(t.carbs) },
    t.fats.trim() && { label: 'Fats', value: withGrams(t.fats) },
    t.fiber.trim() && { label: 'Fiber', value: withGrams(t.fiber) },
    t.water.trim() && { label: 'Water', value: t.water.trim() },
    t.steps.trim() && { label: 'Steps', value: t.steps.trim() },
    t.workoutTarget.trim() && { label: 'Movement', value: t.workoutTarget.trim() },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
        My Plan
      </h1>

      {/* Note from Laura */}
      {plan.clientNotes.trim() && (
        <div style={{ background: 'var(--section-tint)', borderRadius: '1rem', padding: '1.125rem 1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: '#3F6936', marginBottom: '0.375rem' }}>
            <Leaf style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true" /> A note from Laura
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {plan.clientNotes.trim()}
          </p>
        </div>
      )}

      {/* Daily targets */}
      {targets.length > 0 && (
        <section aria-label="Daily targets" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Your Daily Targets
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.625rem' }}>
            {targets.map((target) => (
              <div key={target.label} style={{ background: '#FFFFFF', border: '1px solid rgba(200,220,192,0.35)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>{target.label}</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{target.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weekly meal plan */}
      {plan.mealPlan.length > 0 && (
        <section aria-label="Weekly meal plan" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Your Week
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {plan.mealPlan.map((day, i) => (
              <details key={i} open={i === todayIdx} style={cardStyle}>
                <summary style={{
                  cursor: 'pointer', padding: '0.875rem 1.125rem', fontFamily: 'var(--font-sans)',
                  fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '48px',
                }}>
                  <span>{day.day.trim() || `Day ${i + 1}`}</span>
                  {i === todayIdx && (
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#3F6936', background: 'var(--section-tint)', borderRadius: '999px', padding: '0.25rem 0.625rem' }}>
                      TODAY
                    </span>
                  )}
                </summary>
                <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid rgba(200,220,192,0.3)' }}>
                  <DayMeals day={day} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Recipes */}
      {visibleRecipes.length > 0 && (
        <section aria-label="Recipes" style={{ marginBottom: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            <UtensilsCrossed style={{ width: '1rem', height: '1rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
            Your Recipes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {visibleRecipes.map(({ recipe, index }) => (
              <details key={index} id={`recipe-${index}`} style={cardStyle}>
                <summary style={{ cursor: 'pointer', padding: '0.875rem 1.125rem', minHeight: '48px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {recipe.name.trim() || `Recipe ${index + 1}`}
                  </span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {[
                      recipe.mealType.trim(),
                      recipe.calories.trim() && `${recipe.calories.trim()} cal`,
                      recipe.protein.trim() && `${withGrams(recipe.protein)} protein`,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </summary>
                <div style={{ padding: '0 1.125rem 1.125rem', borderTop: '1px solid rgba(200,220,192,0.3)' }}>
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
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            <ShoppingBasket style={{ width: '1rem', height: '1rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
            Grocery List
          </h2>
          <div style={{ ...cardStyle, padding: '1rem 1.125rem' }}>
            <GroceryChecklist items={plan.groceryList} storageKey={`lumora-grocery-${client.id}`} />
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
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--botanical-green)', marginBottom: '0.125rem' }}>
            {row.slot}{row.meal.macros.trim() ? ` · ${row.meal.macros.trim()}` : ''}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.meal.name.trim() || row.meal.description.trim()}
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
        <div style={{ background: 'var(--section-tint)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem', marginTop: '1rem' }}>
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
