import { ChevronDown } from 'lucide-react'
import {
  cleanIngredientText, clientPortionFactor,
  clientRecipeNotes, shoppingPrepLines, displayRecipeName,
  originalBatchSplitInstruction,
} from '@/lib/coaching-engagement'
import { seasoningSpoonAmount } from '@/lib/household-measure'
import InstructionSteps from '@/components/coaching/InstructionSteps'
import MealPrepPlanner from '@/components/coaching/MealPrepPlanner'
import PrepIngredientList from '@/components/coaching/PrepIngredientList'
import { mealRecipeNames, type CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import type { MealPrepBadge } from '@/lib/cooking-style'
import { mealPrepOccurrenceKey } from '@/lib/grocery-list'

export default function DayMeals({
  day,
  dayIndex,
  recipes,
  individualPlanStyle,
  freshCook = false,
  prepBadges,
  mealPrepStorageKey,
  mealPrepDayIndex,
  selectedMealIndex,
  selectedRecipeIndex,
}: {
  day: CoachingPlanDraft['mealPlan'][number]
  dayIndex: number
  recipes: CoachingPlanDraft['recipes']
  individualPlanStyle: boolean
  /** Solo client who cooks her portion fresh each time (no leftovers). */
  freshCook?: boolean
  /** Cook-day / leftover badges keyed `${dayIndex}:${recipeName}` (solo meal-prep menus). */
  prepBadges?: Map<string, MealPrepBadge>
  /** LocalStorage key shared with the grocery list for per-card prep choices. */
  mealPrepStorageKey?: string
  /** Visible day position within this grocery block. Defaults to dayIndex. */
  mealPrepDayIndex?: number
  selectedMealIndex: number
  selectedRecipeIndex: number
}) {
  const groceryDayIndex = mealPrepDayIndex ?? dayIndex
  const rows = [
    { slot: 'Breakfast', mealKey: 'breakfast', meal: day.breakfast },
    { slot: 'Lunch', mealKey: 'lunch', meal: day.lunch },
    { slot: 'Dinner', mealKey: 'dinner', meal: day.dinner },
    ...day.snacks.map((snack, i) => ({ slot: day.snacks.length > 1 ? `Snack ${i + 1}` : 'Snack', mealKey: `snack${i}`, meal: snack })),
  ].filter((r) => r.meal.name.trim() || r.meal.description.trim())

  return (
    <div>
      {rows.map((row, i) => {
        const mealRecipes = mealRecipeNames(row.meal)
          .map((name) => ({ recipe: recipes.find((item) => item.name === name), name }))
          .filter((entry): entry is { recipe: CoachingPlanDraft['recipes'][number]; name: string } => Boolean(entry.recipe))
        return (
          <section
            key={i}
            id={`day-${dayIndex}-meal-${i}`}
            style={{
              padding: '0.75rem 0',
              borderTop: i === 0 ? 'none' : '1px solid rgba(200,220,192,0.25)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: '#3F6936', margin: '0 0 0.375rem' }}>
              {row.slot}
            </h3>
            {mealRecipes.map(({ recipe, name }) => {
              const recipeIndex = recipes.findIndex((item) => item.name === name)
              const recipeLabel = displayRecipeName(name)
              const isAutoCustom = /^Custom\s+/i.test(recipeLabel)
              const recipePortionFactor = clientPortionFactor(recipe, individualPlanStyle)
              const hasFittedPortion = Math.abs(recipePortionFactor - 1) > 0.001
              const calories = recipe.calories.trim().replace(/\s*k?cal$/i, '')
              const portion = hasFittedPortion
                  ? calories
                    ? `Prescribed serving: ${calories} cal`
                    : 'Prescribed serving'
                  : 'The whole recipe is your portion'
              const badge = prepBadges?.get(`${dayIndex}:${name}`)
              const customIngredients = isAutoCustom
                ? recipe.ingredients.map((ingredient) => {
                    const cleaned = cleanIngredientText(ingredient)
                    const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i)
                    const scaledGrams = match ? Math.max(1, Math.round(Number(match[1]) * recipePortionFactor)) : 0
                    return match
                      ? {
                          amount: seasoningSpoonAmount(match[2].trim(), scaledGrams) ?? `${scaledGrams}g`,
                          name: match[2].trim(),
                        }
                      : { amount: '', name: cleaned }
                  }).filter((ingredient) => ingredient.name)
                : []
              return (
                <div key={name} style={{ marginTop: '0.5rem', background: 'var(--section-tint)', borderRadius: '0.625rem', overflow: 'hidden' }}>
                  <details open={selectedRecipeIndex === recipeIndex || (selectedMealIndex === i && mealRecipes.length === 1)}>
                      <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '0.75rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: '#3F6936', margin: 0 }}>{recipeLabel}</p>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{portion}</p>
                          {badge && (
                            <p style={{
                              fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, marginTop: '0.25rem',
                              color: badge.kind === 'cook' ? '#7A5505' : 'var(--text-muted)',
                            }}>
                              {badge.label}
                            </p>
                          )}
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 700, color: '#3F6936', whiteSpace: 'nowrap' }}>
                          View recipe
                          <ChevronDown className="portal-chevron" style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true" />
                        </span>
                      </summary>
                      <div style={{ borderTop: '1px solid rgba(200,220,192,0.6)', padding: '0 0.875rem 0.875rem' }}>
                        {isAutoCustom ? (
                          <div style={{ paddingTop: '0.75rem' }}>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
                              Weigh out this portion
                            </p>
                            <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              {customIngredients.map((ingredient, ingredientIndex) => (
                                <li key={`${ingredient.name}-${ingredientIndex}`} style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem' }}>
                                  {ingredient.amount && (
                                    <span style={{ minWidth: '3.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 800, color: '#3F6936', textAlign: 'right' }}>
                                      {ingredient.amount}
                                    </span>
                                  )}
                                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                                    {ingredient.name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <MealPrepPlanner
                              recipe={recipe}
                              individualPlanStyle={individualPlanStyle}
                              storageKey={mealPrepStorageKey}
                              occurrenceKey={mealPrepOccurrenceKey(groceryDayIndex, row.mealKey, name)}
                            />
                          </div>
                        ) : (
                          <RecipeDetail
                            recipe={recipe}
                            individualPlanStyle={individualPlanStyle}
                            freshCook={freshCook}
                            mealPrepStorageKey={mealPrepStorageKey}
                            mealPrepOccurrenceKey={mealPrepOccurrenceKey(groceryDayIndex, row.mealKey, name)}
                          />
                        )}
                      </div>
                  </details>
                </div>
              )
            })}
          </section>
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

function RecipeDetail({
  recipe,
  individualPlanStyle,
  freshCook = false,
  mealPrepStorageKey,
  mealPrepOccurrenceKey: occurrenceKey,
}: {
  recipe: CoachingPlanDraft['recipes'][number]
  individualPlanStyle: boolean
  freshCook?: boolean
  mealPrepStorageKey?: string
  mealPrepOccurrenceKey?: string
}) {
  const sectionTitle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700,
    color: 'var(--text-primary)', margin: '1rem 0 0.375rem',
  }
  const bodyText: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6,
  }
  // parseFloat, not Number: the stored value can carry text ("4 servings"),
  // and the portion math (clientPortionFactor) parses it the same way — the
  // family label and the carved factor must never disagree. A pinned card is
  // never presented as a family carve: the whole recipe is her portion.
  const isFamily = !individualPlanStyle && parseFloat(recipe.familyServings) > 1 && !recipe.portionPinned
  // A recipe built as exactly the client's serving (custom/individual, no
  // carve): no gram target and no weigh-out list — the whole recipe is hers,
  // and the amounts to make it already live under Cooking & prep.
  const wholeRecipePortion = !isFamily && clientPortionFactor(recipe, individualPlanStyle) === 1
  // Solo meal-prep recipe: the base recipe is a batch covering several
  // meals, while the portion block holds the single-meal amounts — the same
  // amounts she'd cook if making it fresh that day instead of batching.
  const soloBatch = !isFamily && !wholeRecipePortion && !freshCook
  const portionFactor = clientPortionFactor(recipe, individualPlanStyle)
  const originalBatchSplit = originalBatchSplitInstruction(portionFactor)
  const servingCalories = recipe.calories.trim().replace(/\s*k?cal$/i, '')
  const servingWeight = recipe.clientServingGrams.trim()

  return (
    <div>
      {(servingCalories || servingWeight || isFamily || wholeRecipePortion) && (
        <div style={{ background: 'var(--section-tint)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem', marginTop: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936', marginBottom: '0.125rem' }}>
            {soloBatch ? 'YOUR PRESCRIBED SERVING (if cooking fresh daily)' : 'YOUR PRESCRIBED SERVING'}
          </p>
          {wholeRecipePortion && (
            <>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.125rem 0 0.25rem' }}>
                The whole recipe is your portion
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Make it as written and enjoy all of it.
              </p>
            </>
          )}
          {(servingWeight || servingCalories) && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {[
                servingWeight && `${servingWeight.replace(/\s*g$/i, '')}g cooked serving`,
                servingCalories && `${servingCalories} cal`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          {!wholeRecipePortion && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936', marginBottom: '0.25rem' }}>
                Most accurate
              </p>
              <p style={{ ...bodyText, fontSize: '0.8125rem' }}>
                {servingWeight
                  ? `Prepare the prescribed ingredient amounts below. After cooking, eat the full ${servingWeight.replace(/\s*g$/i, '')}g serving.`
                  : 'Prepare the prescribed ingredient amounts below and eat the full cooked serving.'}
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936', margin: '0.625rem 0 0.25rem' }}>
                No scale
              </p>
              <p style={{ ...bodyText, fontSize: '0.8125rem' }}>
                Cook the prescribed ingredient amounts below and eat all of the prepared food. Do not divide it again.
              </p>
              {originalBatchSplit && (
                <div style={{ marginTop: '0.625rem', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.38)', border: '1px solid rgba(63,105,54,0.14)', borderRadius: '0.5rem' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936', margin: 0 }}>
                    If cooking the original full recipe instead
                  </p>
                  <p style={{ ...bodyText, fontSize: '0.8125rem', marginTop: '0.2rem' }}>
                    Use the original Recipe Library ingredient amounts. {originalBatchSplit}
                  </p>
                </div>
              )}
            </div>
          )}
          {!wholeRecipePortion && (
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)',
              marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid rgba(200,220,192,0.6)',
            }}>
              <span style={{ fontWeight: 700, color: '#3F6936' }}>How to use this: </span>
              The ingredients below already make your complete prescribed serving. Cook them and eat the full prepared serving. Use Meal prep only when adding food for other people or future days.
            </p>
          )}
        </div>
      )}

      <MealPrepPlanner
        recipe={recipe}
        individualPlanStyle={individualPlanStyle}
        storageKey={mealPrepStorageKey}
        occurrenceKey={occurrenceKey}
      />

      <p style={{ ...bodyText, marginTop: '0.75rem' }}>
        {[
          recipe.prepTime.trim() && `Prep ${recipe.prepTime.trim()}`,
          recipe.cookTime.trim() && `Cook ${recipe.cookTime.trim()}`,
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
            {wholeRecipePortion ? 'Cooking & prep' : 'Cooking & prep for your serving'}
          </h3>
          <p style={{ ...bodyText, fontSize: '0.8125rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            {wholeRecipePortion
              ? 'Make the full amounts below. Ingredients are shown before cooking unless a line says cooked weight.'
              : 'These ingredient amounts are scaled to make your prescribed serving. Ingredients are shown before cooking unless a line says cooked weight. Use Meal prep above to add portions for other people or future days.'}
          </p>
          <PrepIngredientList lines={shoppingPrepLines(recipe.ingredients, portionFactor)} />
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

      {clientRecipeNotes(recipe.notes) && (
        <p style={{ ...bodyText, marginTop: '0.75rem', fontStyle: 'italic', whiteSpace: 'pre-line' }}>
          {clientRecipeNotes(recipe.notes)}
        </p>
      )}
    </div>
  )
}
