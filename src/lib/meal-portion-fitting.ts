import type {
  CoachingPlanDraft,
  PlanMeal,
} from './coaching-plan-schema'
import { declaredServingMultiplier } from './nutrition-math.ts'
import { isIndividualPlanStyle } from './cooking-style.ts'

type Nutrients = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

type MealPercentages = {
  breakfastPct?: string
  lunchPct?: string
  dinnerPct?: string
  snackPct?: string
  // 'individual_only' plans treat recipes as exact grams as entered, so a
  // recipe's declared family servings don't shape its portion bounds.
  mealPlanStyle?: string
}

function firstNumber(value: string | undefined) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function mealRecipeNames(meal: Pick<PlanMeal, 'recipeName' | 'recipeNames'>) {
  const names = (meal.recipeNames ?? []).map((name) => name.trim()).filter(Boolean)
  return names.length > 0
    ? [...new Set(names)]
    : meal.recipeName.trim() ? [meal.recipeName.trim()] : []
}

function nutrientsForNames(names: string[], recipes: CoachingPlanDraft['recipes']): Nutrients {
  return names.reduce<Nutrients>((total, name) => {
    const recipe = recipes.find((candidate) => candidate.name === name)
    if (!recipe) return total
    return {
      calories: total.calories + firstNumber(recipe.calories),
      protein: total.protein + firstNumber(recipe.protein),
      carbs: total.carbs + firstNumber(recipe.carbs),
      fats: total.fats + firstNumber(recipe.fats),
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
}

function isAdjustableRecipe(name: string, recipes: CoachingPlanDraft['recipes']) {
  // Custom slot foods represent exact coach-entered quantities and must never
  // be silently resized. Pinned cards are the coach's explicit "as-written is
  // her portion" — they contribute fixed macros the rest of the slot absorbs.
  if (/\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/.test(name)) return false
  return !recipes.find((recipe) => recipe.name === name)?.portionPinned
}

function macroAwareScale(current: Nutrients, target: Nutrients) {
  // Calories and protein carry the most weight. Carbs and fats still shape the
  // result, but cannot pull a serving far away from the client's energy goal.
  const entries: Array<[keyof Nutrients, number]> = [
    ['calories', 8],
    ['protein', 4],
    ['carbs', 2],
    ['fats', 2],
  ]
  let numerator = 0
  let denominator = 0
  for (const [key, weight] of entries) {
    if (current[key] <= 0 || target[key] <= 0) continue
    const ratio = current[key] / target[key]
    numerator += weight * ratio
    denominator += weight * ratio * ratio
  }
  return denominator > 0 ? numerator / denominator : 1
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

// A family recipe portion must stay a genuine share of the pot — never a
// whole (or nearly whole) family recipe priced as one client serving.
const MAX_FAMILY_SHARE = 0.9
const MAX_INDIVIDUAL_MULTIPLIER = 4

/**
 * Fit recipe portions to the client's daily calories and macros while keeping
 * the chosen foods unchanged. Meal percentages guide distribution; a final
 * daily calorie correction prevents small macro-ratio compromises from
 * leaving the day materially above or below target.
 *
 * This runs both at draft generation and again on every plan save (library
 * edits re-synced into a plan change recipe nutrition, and the portions must
 * be re-carved to keep the client's day on target). The declared serving
 * count describes the recipe, never the client: a light serves-4 pot can be
 * carved as half the pot when her macros call for it. Because each fit
 * re-derives the portion straight from the recipe's nutrition and the
 * targets, repeated refits converge instead of compounding a stale carve.
 */
export function fitRecipeServingMultipliers(
  plan: CoachingPlanDraft,
  percentages: MealPercentages,
) {
  const dailyTarget: Nutrients = {
    calories: firstNumber(plan.macroTargets.calories),
    protein: firstNumber(plan.macroTargets.protein),
    carbs: firstNumber(plan.macroTargets.carbs),
    fats: firstNumber(plan.macroTargets.fats),
  }
  if (dailyTarget.calories <= 0) return new Map<string, number>()

  const rawPercentages = {
    breakfast: firstNumber(percentages.breakfastPct) || 35,
    lunch: firstNumber(percentages.lunchPct) || 30,
    dinner: firstNumber(percentages.dinnerPct) || 25,
    snack: firstNumber(percentages.snackPct) || 10,
  }
  const percentageTotal = Object.values(rawPercentages).reduce((sum, value) => sum + value, 0) || 100
  const candidates = new Map<string, number[]>()

  for (const day of plan.mealPlan) {
    const slots = [
      { meal: day.breakfast, share: rawPercentages.breakfast / percentageTotal },
      { meal: day.lunch, share: rawPercentages.lunch / percentageTotal },
      { meal: day.dinner, share: rawPercentages.dinner / percentageTotal },
      ...day.snacks.map((meal) => ({
        meal,
        share: (rawPercentages.snack / percentageTotal) / Math.max(1, day.snacks.length),
      })),
    ]

    const fitted = slots.map(({ meal, share }) => {
      const names = mealRecipeNames(meal)
      const adjustableNames = names.filter((name) => isAdjustableRecipe(name, plan.recipes))
      const fixedNames = names.filter((name) => !isAdjustableRecipe(name, plan.recipes))
      const adjustable = nutrientsForNames(adjustableNames, plan.recipes)
      const fixed = nutrientsForNames(fixedNames, plan.recipes)
      const slotTarget = {
        calories: dailyTarget.calories * share,
        protein: dailyTarget.protein * share,
        carbs: dailyTarget.carbs * share,
        fats: dailyTarget.fats * share,
      }
      const adjustableTarget = {
        calories: Math.max(0, slotTarget.calories - fixed.calories),
        protein: Math.max(0, slotTarget.protein - fixed.protein),
        carbs: Math.max(0, slotTarget.carbs - fixed.carbs),
        fats: Math.max(0, slotTarget.fats - fixed.fats),
      }
      return {
        adjustableNames,
        adjustable,
        fixed,
        scale: macroAwareScale(adjustable, adjustableTarget),
      }
    })
    const fixedCalories = fitted.reduce((sum, slot) => sum + slot.fixed.calories, 0)
    const predictedAdjustableCalories = fitted.reduce(
      (sum, slot) => sum + slot.adjustable.calories * slot.scale,
      0,
    )
    const dayCorrection = predictedAdjustableCalories > 0
      ? Math.max(0, dailyTarget.calories - fixedCalories) / predictedAdjustableCalories
      : 1

    const individualPlanStyle = isIndividualPlanStyle(percentages.mealPlanStyle)
    for (const { adjustableNames, scale } of fitted) {
      for (const name of adjustableNames) {
        const recipe = plan.recipes.find((candidate) => candidate.name === name)
        if (!recipe) continue
        const familyCount = firstNumber(recipe.familyServings || recipe.servings)
        const isFamily = !individualPlanStyle && familyCount > 1
        const baseline = firstNumber(recipe.clientServingMultiplier)
          || declaredServingMultiplier(familyCount, isFamily)
        // The portion chases the client's macro targets alone; the declared
        // serving count never bounds it. Only hard practical caps apply — a
        // family portion is never the (nearly) whole pot priced as one
        // serving, and an individual dish never scales past 4x. A stale or
        // corrupt stored carve still can't survive a refit: the recipe's
        // card macros scale with the baseline, so `baseline * scale` lands
        // on the target-driven share regardless of where the carve started.
        const maxShare = isFamily ? MAX_FAMILY_SHARE : MAX_INDIVIDUAL_MULTIPLIER
        const unbounded = baseline * scale * dayCorrection
        const desired = Math.round(Math.min(maxShare, Math.max(0.001, unbounded)) * 1000) / 1000
        const values = candidates.get(name) ?? []
        values.push(desired)
        candidates.set(name, values)
      }
    }
  }

  return new Map(
    [...candidates].map(([name, values]) => [name, median(values)]),
  )
}
