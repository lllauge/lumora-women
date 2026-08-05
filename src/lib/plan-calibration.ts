import {
  mealRecipeNames,
  type CoachingPlanDraft,
  type PlanMeal,
} from './coaching-plan-schema.ts'
import { allocateMealCalorieTargets } from './meal-calorie-targets.ts'

type MealPercentages = {
  breakfastPct?: string
  lunchPct?: string
  dinnerPct?: string
  snackPct?: string
}

function firstNumber(value: string | undefined) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function mealCalories(meal: PlanMeal, recipes: CoachingPlanDraft['recipes']) {
  const names = mealRecipeNames(meal)
  if (names.length === 0) return null
  let total = 0
  for (const name of names) {
    const recipe = recipes.find((candidate) => candidate.name === name)
    if (!recipe) return Number.NaN
    const calories = firstNumber(recipe.calories)
    if (calories <= 0) return Number.NaN
    total += calories
  }
  return Math.round(total)
}

/**
 * A saved plan can be reused without contacting USDA when every populated
 * meal already equals its current whole-calorie target. Changes to the daily
 * target or percentages produce different slot targets and fail this check.
 */
export function isPlanCalibrated(
  plan: CoachingPlanDraft,
  percentages: MealPercentages,
) {
  const dailyCalories = firstNumber(plan.macroTargets.calories)
  if (dailyCalories <= 0) return false

  const configured = {
    breakfast: firstNumber(percentages.breakfastPct) || 35,
    lunch: firstNumber(percentages.lunchPct) || 30,
    dinner: firstNumber(percentages.dinnerPct) || 25,
    snack: firstNumber(percentages.snackPct) || 10,
  }
  let populatedSlots = 0

  for (const day of plan.mealPlan) {
    const activeSnackCount = day.snacks.filter((snack) => mealRecipeNames(snack).length > 0).length
    const slots = [
      ...(mealRecipeNames(day.breakfast).length > 0
        ? [{ key: 'breakfast', meal: day.breakfast, percentage: configured.breakfast }]
        : []),
      ...(mealRecipeNames(day.lunch).length > 0
        ? [{ key: 'lunch', meal: day.lunch, percentage: configured.lunch }]
        : []),
      ...(mealRecipeNames(day.dinner).length > 0
        ? [{ key: 'dinner', meal: day.dinner, percentage: configured.dinner }]
        : []),
      ...day.snacks.flatMap((snack, snackIndex) => (
        mealRecipeNames(snack).length > 0
          ? [{
            key: `snack${snackIndex}`,
            meal: snack,
            percentage: configured.snack / Math.max(1, activeSnackCount),
          }]
          : []
      )),
    ]
    const targets = allocateMealCalorieTargets(dailyCalories, slots)
    for (const slot of slots) {
      populatedSlots += 1
      if (mealCalories(slot.meal, plan.recipes) !== targets.get(slot.key)) return false
    }
  }

  return populatedSlots > 0
}
