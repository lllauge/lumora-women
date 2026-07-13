// Cooking-style semantics for a plan's mealPlanStyle planning input. Four
// lifestyles, one axis: who eats the pot and how often she cooks.
//   family_dinners   — full recipes cooked per meal, her portion carved out,
//                      the family eats the rest.
//   family_meal_prep — same family math (a repeated dinner still feeds the
//                      family every time, so groceries are identical), but
//                      repeats are double-batched: cook once at multiple
//                      yield, reheat on the repeat nights.
//   individual_only  — solo meal-prep: cook whole batches, repeats of a
//                      recipe during the week are leftovers.
//   individual_fresh — solo fresh cook: she cooks exactly her portion every
//                      time; recipes and groceries scale down to it.
// Pure module (no server deps) with explicit .ts extensions so it loads under
// `node --test --experimental-strip-types`.
import { soloBatchCount, soloPortion, type GroceryListOptions } from './grocery-list.ts'
import { mealRecipeNames, type CoachingPlanDraft } from './coaching-plan-schema.ts'

/** Both solo styles: recipes are priced at exact grams, never family-carved. */
export function isIndividualPlanStyle(style: unknown): boolean {
  return style === 'individual_only' || style === 'individual_fresh'
}

export function isFreshCookStyle(style: unknown): boolean {
  return style === 'individual_fresh'
}

/** Family macros and groceries, but repeated dinners get double-batch coaching. */
export function isFamilyMealPrepStyle(style: unknown): boolean {
  return style === 'family_meal_prep'
}

/** The grocery math that matches a plan's cooking style. */
export function groceryListOptions(style: unknown): GroceryListOptions {
  return {
    soloClient: isIndividualPlanStyle(style),
    freshCook: isFreshCookStyle(style),
  }
}

export type MealPrepBadge = {
  kind: 'cook' | 'leftover'
  label: string
}

function dayLabel(day: CoachingPlanDraft['mealPlan'][number], position: number): string {
  return day.day.trim() || `Day ${position + 1}`
}

function listDays(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

function recipeAppearances(
  days: { day: CoachingPlanDraft['mealPlan'][number]; index: number }[],
): Map<string, { dayIndex: number; dayName: string }[]> {
  const appearances = new Map<string, { dayIndex: number; dayName: string }[]>()
  for (const [position, { day, index }] of days.entries()) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      for (const name of mealRecipeNames(meal)) {
        const seen = appearances.get(name) ?? []
        seen.push({ dayIndex: index, dayName: dayLabel(day, position) })
        appearances.set(name, seen)
      }
    }
  }
  return appearances
}

const BATCH_WORD = ['', '', 'double', 'triple', 'quadruple']

/**
 * Double-batch coaching for a family meal-prep menu, keyed like
 * mealPrepBadges. The family eats the whole dish every time it appears, so
 * quantities never change — a repeat just means the first night cooks a
 * multiple batch and the repeat nights reheat instead of cooking again.
 */
export function familyPrepBadges(
  days: { day: CoachingPlanDraft['mealPlan'][number]; index: number }[],
): Map<string, MealPrepBadge> {
  const badges = new Map<string, MealPrepBadge>()
  for (const [name, uses] of recipeAppearances(days)) {
    if (uses.length < 2) continue
    const [first, ...rest] = uses
    const laterDays = [...new Set(rest.map((use) => use.dayName).filter((d) => d !== first.dayName))]
    const batchWord = BATCH_WORD[uses.length] ?? `${uses.length}×`
    badges.set(`${first.dayIndex}:${name}`, {
      kind: 'cook',
      label: `Make a ${batchWord} batch — refrigerate the extra for ${listDays(laterDays) || 'the repeat meals'}`,
    })
    for (const use of rest) {
      const key = `${use.dayIndex}:${name}`
      if (badges.has(key)) continue
      badges.set(key, {
        kind: 'leftover',
        label: `Already cooked ${first.dayName} — just reheat and serve`,
      })
    }
  }
  return badges
}

/**
 * Cook-day / leftover badges for a solo meal-prep menu, keyed by
 * `${dayIndex}:${recipeName}`. A recipe whose batches cover several meal
 * slots gets a "cook" badge on its first appearance (saying which later days
 * it covers) and "leftover" badges on the repeats. Recipes cooked every time
 * they appear (single-serving dishes, one-off meals) get no badge.
 */
export function mealPrepBadges(
  days: { day: CoachingPlanDraft['mealPlan'][number]; index: number }[],
  recipes: CoachingPlanDraft['recipes'],
): Map<string, MealPrepBadge> {
  const badges = new Map<string, MealPrepBadge>()
  for (const [name, uses] of recipeAppearances(days)) {
    if (uses.length < 2) continue
    const recipe = recipes.find((r) => r.name === name)
    if (!recipe) continue
    // Meals one physical batch covers: a leftover smaller than her portion
    // isn't a meal. The 0.1 slack forgives macro-fitted portions sitting just
    // over an even split (0.52 of a pot still halves). Below 2, she's cooking
    // (nearly) every time this recipe comes up — batch coaching would only
    // narrate daily cooking (e.g. a ¾-portion breakfast), so say nothing.
    const servingsPerBatch = Math.floor(1 / soloPortion(recipe) + 0.1)
    if (servingsPerBatch < 2) continue
    const batches = soloBatchCount(recipe, uses.length)
    if (batches >= uses.length) continue

    const [first, ...rest] = uses
    const laterDays = [...new Set(rest.map((use) => use.dayName).filter((d) => d !== first.dayName))]
    badges.set(`${first.dayIndex}:${name}`, {
      kind: 'cook',
      label: batches === 1
        ? `Cook day — this batch also covers ${listDays(laterDays) || 'later meals'}`
        : `Cook day — one batch covers about ${servingsPerBatch} meals, make a fresh one when it runs out`,
    })
    for (const use of rest) {
      const key = `${use.dayIndex}:${name}`
      if (badges.has(key)) continue
      badges.set(key, {
        kind: 'leftover',
        label: batches === 1
          ? `Leftovers from ${first.dayName} — just reheat`
          : 'Leftovers — reheat, or cook a fresh batch if it ran out',
      })
    }
  }
  return badges
}
