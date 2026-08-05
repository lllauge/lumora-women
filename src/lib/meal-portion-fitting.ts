import type {
  CoachingPlanDraft,
  PlanMeal,
} from './coaching-plan-schema'
import { declaredServingMultiplier } from './nutrition-math.ts'
import { isIndividualPlanStyle } from './cooking-style.ts'
import { allocateMealCalorieTargets } from './meal-calorie-targets.ts'

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
  // be silently resized. Library recipes can be cloned per slot with the same
  // suffix, and those must remain adjustable so lunch and snack can prescribe
  // different portions of the same original recipe.
  if (/^Custom\s+.+\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/i.test(name)) return false
  // Pinned cards are the coach's explicit "as-written is her portion" — they
  // contribute fixed macros the rest of the slot absorbs.
  return !recipes.find((recipe) => recipe.name === name)?.portionPinned
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

// Recipes can scale up or down to hit the slot calorie target. The library
// recipe remains immutable; the plan card stores the client's scaled portion.
const MAX_FAMILY_MULTIPLIER = 4
const MAX_INDIVIDUAL_MULTIPLIER = 4
// Hard floor for a carve, and the threshold below which a stored carve is
// treated as collapsed rather than deliberate: 1% of a recipe is never a real
// serving of a meal.
const MIN_MULTIPLIER = 0.001
const COLLAPSED_MULTIPLIER = 0.01

/**
 * Fit recipe portions to the client's daily calories and macros while keeping
 * the chosen foods unchanged. Meal percentages are calorie budgets: every
 * adjustable slot is fitted directly to its calorie target. Protein, carbs,
 * and fats remain the natural result of the selected foods rather than being
 * allowed to pull a meal away from its calorie budget.
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
    const activeSnackCount = Math.max(1, day.snacks.filter((meal) => mealRecipeNames(meal).length > 0).length)
    const rawSlots = [
      { meal: day.breakfast, percentage: rawPercentages.breakfast },
      { meal: day.lunch, percentage: rawPercentages.lunch },
      { meal: day.dinner, percentage: rawPercentages.dinner },
      ...day.snacks.map((meal) => ({
        meal,
        percentage: rawPercentages.snack / activeSnackCount,
      })),
    ]
    const activeSlots = rawSlots.filter(({ meal }) => mealRecipeNames(meal).length > 0)
    const activePercentageTotal = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0) || percentageTotal
    const slots = activeSlots.map(({ meal, percentage }, index) => ({
      key: `slot-${index}`,
      meal,
      share: percentage / activePercentageTotal,
      percentage,
    }))
    const calorieTargets = allocateMealCalorieTargets(
      dailyTarget.calories,
      slots.map((slot) => ({ key: slot.key, percentage: slot.percentage })),
    )

    const fitted = slots.map(({ key, meal, share }) => {
      const names = mealRecipeNames(meal)
      const adjustableNames = names.filter((name) => isAdjustableRecipe(name, plan.recipes))
      const fixedNames = names.filter((name) => !isAdjustableRecipe(name, plan.recipes))
      const adjustable = nutrientsForNames(adjustableNames, plan.recipes)
      const fixed = nutrientsForNames(fixedNames, plan.recipes)
      const slotTarget = {
        calories: calorieTargets.get(key) ?? dailyTarget.calories * share,
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
        scale: adjustable.calories > 0
          ? adjustableTarget.calories / adjustable.calories
          : 1,
      }
    })

    const individualPlanStyle = isIndividualPlanStyle(percentages.mealPlanStyle)
    for (const { adjustableNames, scale } of fitted) {
      for (const name of adjustableNames) {
        const recipe = plan.recipes.find((candidate) => candidate.name === name)
        if (!recipe) continue
        const familyCount = firstNumber(recipe.familyServings || recipe.servings)
        const isFamily = !individualPlanStyle && familyCount > 1
        const stored = firstNumber(recipe.clientServingMultiplier)
        // A collapsed carve cannot heal through the slot scale: its card
        // macros are near zero, so a slot that another recipe already fills
        // keeps a scale near 1 and `baseline * scale` stays at the floor
        // forever. Re-seed from the declared serving share (a fifth of a
        // serves-5 pot, regardless of plan style) so the fit re-derives a
        // real portion on the next pass.
        const baseline = stored > COLLAPSED_MULTIPLIER
          ? stored
          : declaredServingMultiplier(familyCount, familyCount > 1)
        // The portion chases the client's macro targets alone; the declared
        // serving count never bounds it. A stale or corrupt stored carve still
        // can't survive a refit: the recipe's
        // card macros scale with the baseline, so `baseline * scale` lands
        // on the target-driven share regardless of where the carve started.
        const maxMultiplier = isFamily ? MAX_FAMILY_MULTIPLIER : MAX_INDIVIDUAL_MULTIPLIER
        const unbounded = baseline * scale
        const desired = Math.round(Math.min(maxMultiplier, Math.max(MIN_MULTIPLIER, unbounded)) * 1000000) / 1000000
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
