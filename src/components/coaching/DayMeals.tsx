import { ChevronDown } from 'lucide-react'
import {
  cleanIngredientText, clientPortionFactor, clientPortionLines, isClientReadable, portionFraction,
  clientRecipeNotes, shoppingPrepLines, displayRecipeName, withGrams,
} from '@/lib/coaching-engagement'
import InstructionSteps from '@/components/coaching/InstructionSteps'
import PrepIngredientList from '@/components/coaching/PrepIngredientList'
import { mealRecipeNames, type CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import type { MealPrepBadge } from '@/lib/cooking-style'

export default function DayMeals({
  day,
  dayIndex,
  recipes,
  individualPlanStyle,
  freshCook = false,
  prepBadges,
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
  selectedMealIndex: number
  selectedRecipeIndex: number
}) {
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
        const displayName = mealRecipes.map(({ name }) => displayRecipeName(name)).filter(Boolean).join(' + ')
          || displayRecipeName(row.meal.name)
        return (
          <details
            key={i}
            id={`day-${dayIndex}-meal-${i}`}
            open={selectedMealIndex === i}
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
              </div>
              <span aria-hidden="true" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', flexShrink: 0 }}>▸</span>
            </summary>
            <div style={{ paddingTop: '0.5rem' }}>
            {mealRecipes.map(({ recipe, name }) => {
              const recipeIndex = recipes.findIndex((item) => item.name === name)
              const recipeLabel = displayRecipeName(name)
              const isAutoCustom = /^Custom\s+/i.test(recipeLabel)
              const factor = clientPortionFactor(recipe, individualPlanStyle)
              const fraction = portionFraction(factor)
              const portion = fraction && fraction.label !== 'the whole recipe'
                ? `${fraction.label} of recipe`
                : 'The whole recipe is your portion'
              const badge = prepBadges?.get(`${dayIndex}:${name}`)
              const customIngredients = isAutoCustom
                ? recipe.ingredients.map((ingredient) => {
                    const cleaned = cleanIngredientText(ingredient)
                    const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i)
                    return match
                      ? { amount: `${match[1]}g`, name: match[2].trim() }
                      : { amount: '', name: cleaned }
                  }).filter((ingredient) => ingredient.name)
                : []
              return (
                <div key={name} style={{ marginTop: '0.5rem', background: 'var(--section-tint)', borderRadius: '0.625rem', overflow: 'hidden' }}>
                  {isAutoCustom ? (
                    <div style={{ padding: '0.75rem 0.875rem' }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: '#3F6936', margin: 0 }}>{recipeLabel}</p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '0.35rem' }}>
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
                    </div>
                  ) : (
                    <details open={selectedRecipeIndex === recipeIndex}>
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
                        <RecipeDetail recipe={recipe} individualPlanStyle={individualPlanStyle} freshCook={freshCook} />
                      </div>
                    </details>
                  )}
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

function RecipeDetail({
  recipe,
  individualPlanStyle,
  freshCook = false,
}: {
  recipe: CoachingPlanDraft['recipes'][number]
  individualPlanStyle: boolean
  freshCook?: boolean
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
  const portionLines = clientPortionLines(recipe, individualPlanStyle).filter((line) => line.grams !== null)
  const detailFraction = portionFraction(clientPortionFactor(recipe, individualPlanStyle))
  // For family recipes the headline is "¼ of the recipe" (human-friendly),
  // with the gram total kept as small subtext. For individual recipes the
  // gram weight IS the meaningful headline, so we show it as before.
  const fractionHeadline = isFamily && detailFraction && detailFraction.label !== 'the whole recipe'
    ? `${detailFraction.qualifier ? `A ${detailFraction.qualifier} ${detailFraction.label}` : detailFraction.label} of the recipe`
    : ''
  const headline = fractionHeadline || wholeRecipePortion
    ? [] // fraction/whole-recipe headline replaces the gram-based headline
    : ([
        recipe.clientServingGrams.trim() && withGrams(recipe.clientServingGrams),
        isClientReadable(recipe.clientServingMeasure) && recipe.clientServingMeasure.trim(),
        isClientReadable(recipe.clientServing) && cleanIngredientText(recipe.clientServing),
      ].filter(Boolean) as string[])

  return (
    <div>
      {(headline.length > 0 || portionLines.length > 0 || fractionHeadline || isFamily || wholeRecipePortion) && (
        <div style={{ background: 'var(--section-tint)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem', marginTop: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#3F6936', marginBottom: '0.125rem' }}>
            {isFamily ? 'YOUR PORTION (family recipe)' : 'YOUR PORTION'}
          </p>
          {fractionHeadline && (
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.125rem 0 0.25rem' }}>
              {fractionHeadline}
            </p>
          )}
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
          {headline.length > 0 && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {headline.join(' · ')}
            </p>
          )}
          {!isFamily && !wholeRecipePortion && portionLines.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {freshCook ? 'Cook with just these amounts — they make one portion, yours:' : 'Weigh out your serving:'}
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
            const fraction = portionFraction(clientPortionFactor(recipe, individualPlanStyle))
            // The whole-recipe headline above already says it all.
            if (!fraction || wholeRecipePortion) return null
            if (freshCook) {
              // Fresh cooks never make the full recipe, so the divide-the-pot
              // tip would send her the wrong way.
              return (
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)',
                  marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid rgba(200,220,192,0.6)',
                }}>
                  <span style={{ fontWeight: 700, color: '#3F6936' }}>Cooking fresh: </span>
                  {`Make just the amounts above (about ${fraction.label} of the written recipe) — it comes out to a single serving, so there's nothing to divide or store.`}
                </p>
              )
            }
            return (
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)',
                marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid rgba(200,220,192,0.6)',
              }}>
                <span style={{ fontWeight: 700, color: '#3F6936' }}>{isFamily ? 'How to portion it: ' : 'No scale? '}</span>
                {fraction.label === 'the whole recipe'
                  ? 'This whole recipe is your portion, enjoy all of it.'
                  : `Cook the full recipe and divide it into ${fraction.parts} equal portions — ${
                      fraction.take === 1 ? `one is your serving (about ${fraction.label})` : `${fraction.take} of them are your serving (about ${fraction.label})`
                    }${
                      fraction.qualifier === 'generous' ? ', a little over is right' : fraction.qualifier === 'scant' ? ', a little under is right' : ''
                    }. That split keeps the listed calories and macros on track.`}
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
            {isFamily ? 'Cooking & prep (full family recipe)' : 'Cooking & prep'}
          </h3>
          <p style={{ ...bodyText, fontSize: '0.8125rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            {freshCook && !wholeRecipePortion
              ? 'The full written recipe, for reference — cook with your single-portion amounts above instead. Your grocery list is already scaled to them.'
              : 'Amounts to buy and prep — raw, before cooking, unless a line says cooked weight.'}
            {freshCook && !wholeRecipePortion
              ? ''
              : isFamily
                ? ' Your serving is portioned from the finished dish, after cooking.'
                : wholeRecipePortion
                  ? ' Make the full amounts below — the whole recipe is your serving.'
                  : ' When you weigh your serving above, use the food as it’s listed there: cooked unless marked otherwise.'}
          </p>
          <PrepIngredientList lines={shoppingPrepLines(recipe.ingredients)} />
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
