import type {
  CoachingPlanDraft,
  PlanMeal,
} from './coaching-plan-schema'

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

function isAdjustableRecipe(name: string) {
  // Custom slot foods represent exact coach-entered quantities and must never
  // be silently resized. Only actual recipe portions are fitted.
  return !/\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/.test(name)
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

/**
 * Fit recipe portions to the client's daily calories and macros while keeping
 * the chosen foods unchanged. Meal percentages guide distribution; a final
 * daily calorie correction prevents small macro-ratio compromises from
 * leaving the day materially above or below target.
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
      const adjustableNames = names.filter(isAdjustableRecipe)
      const fixedNames = names.filter((name) => !isAdjustableRecipe(name))
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

    for (const { adjustableNames, scale } of fitted) {
      for (const name of adjustableNames) {
        const recipe = plan.recipes.find((candidate) => candidate.name === name)
        if (!recipe) continue
        const baseline = firstNumber(recipe.clientServingMultiplier) || 1
        // Keep portions practical: at most 50% smaller or larger than the
        // recipe's declared serving, then round to a stable 0.1% share.
        const relativeScale = Math.max(0.5, Math.min(1.5, scale * dayCorrection))
        const desired = Math.round(baseline * relativeScale * 1000) / 1000
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
