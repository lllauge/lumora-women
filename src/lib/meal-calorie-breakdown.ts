import {
  mealRecipeNames,
  stripSlotRecipeSuffixes,
  type CoachingPlanDraft,
  type PlanMeal,
} from './coaching-plan-schema.ts'
import {
  declaredServingMultiplier,
  resolvedServingMultiplier,
} from './nutrition-math.ts'

type Recipe = CoachingPlanDraft['recipes'][number]

export type MealSlotKind = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MealCalorieBreakdownRecipe = {
  name: string
  displayName: string
  savedCalories: number
  fullRecipeCalories: number
  familyServings: number
  declaredMultiplier: number
  effectiveMultiplier: number
  declaredServingCalories: number
  prescribedServings: number
  adjustable: boolean
  formula: string
  reason: string
}

export type MealCalorieBreakdown = {
  label: string
  percentage: number
  percentageTotal: number
  targetCalories: number
  targetFormula: string
  savedCalories: number
  deltaCalories: number
  recipes: MealCalorieBreakdownRecipe[]
  missingRecipes: string[]
}

function firstNumber(value: unknown) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

function mealPercentage(slot: MealSlotKind, planningInputs: Record<string, unknown>) {
  const percentages = {
    breakfast: firstNumber(planningInputs.breakfastPct) || 35,
    lunch: firstNumber(planningInputs.lunchPct) || 30,
    dinner: firstNumber(planningInputs.dinnerPct) || 25,
    snack: firstNumber(planningInputs.snackPct) || 10,
  }
  const total = Object.values(percentages).reduce((sum, value) => sum + value, 0) || 100
  return { percentage: percentages[slot], total }
}

function isSlotRecipe(name: string) {
  return /^Custom\s+.+\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/i.test(name)
}

function recipeBreakdown(recipe: Recipe): MealCalorieBreakdownRecipe {
  const savedCalories = firstNumber(recipe.calories)
  const familyServings = firstNumber(recipe.familyServings || recipe.servings)
  const isFamilyRecipe = familyServings > 1
  const declaredMultiplier = declaredServingMultiplier(familyServings, isFamilyRecipe)
  const effectiveMultiplier = recipe.portionPinned
    ? 1
    : resolvedServingMultiplier(recipe.clientServingMultiplier, familyServings, isFamilyRecipe)
  const fullRecipeCalories = effectiveMultiplier > 0
    ? savedCalories / effectiveMultiplier
    : savedCalories
  const declaredServingCalories = fullRecipeCalories * declaredMultiplier
  const prescribedServings = declaredMultiplier > 0
    ? effectiveMultiplier / declaredMultiplier
    : 1
  const adjustable = true

  const familyText = familyServings > 1
    ? `serves ${round1(familyServings)}`
    : 'single serving'
  const formula = familyServings > 1
    ? `${Math.round(fullRecipeCalories)} cal full recipe / ${round1(familyServings)} servings = ${Math.round(declaredServingCalories)} cal per original serving; ${Math.round(fullRecipeCalories)} x ${round3(effectiveMultiplier)} = ${Math.round(savedCalories)} prescribed cal`
    : `${Math.round(fullRecipeCalories)} cal recipe x ${round3(effectiveMultiplier)} = ${Math.round(savedCalories)} prescribed cal`
  const reason = isSlotRecipe(recipe.name)
    ? 'Adjustable custom meal: USDA totals are scaled to the meal calorie budget and the resulting portion is saved.'
    : `Adjustable recipe: fitter compares this ${familyText} recipe against the meal calorie budget and saves the resulting multiplier.`

  return {
    name: recipe.name,
    displayName: stripSlotRecipeSuffixes(recipe.name),
    savedCalories: round1(savedCalories),
    fullRecipeCalories: round1(fullRecipeCalories),
    familyServings: round1(familyServings),
    declaredMultiplier: round3(declaredMultiplier),
    effectiveMultiplier: round3(effectiveMultiplier),
    declaredServingCalories: round1(declaredServingCalories),
    prescribedServings: round3(prescribedServings),
    adjustable,
    formula,
    reason,
  }
}

export function buildMealCalorieBreakdown({
  label,
  meal,
  recipes,
  dailyCalories,
  slot,
  snackCount = 1,
  planningInputs,
  percentageTotal,
  targetCaloriesOverride,
}: {
  label: string
  meal: PlanMeal
  recipes: CoachingPlanDraft['recipes']
  dailyCalories: number
  slot: MealSlotKind
  snackCount?: number
  planningInputs: Record<string, unknown>
  percentageTotal?: number
  targetCaloriesOverride?: number
}): MealCalorieBreakdown {
  const names = mealRecipeNames(meal)
  const { percentage, total } = mealPercentage(slot, planningInputs)
  const slotPercentage = slot === 'snack'
    ? percentage / Math.max(1, snackCount)
    : percentage
  const resolvedPercentageTotal = percentageTotal && percentageTotal > 0 ? percentageTotal : total
  const targetCalories = targetCaloriesOverride ?? (dailyCalories > 0
    ? dailyCalories * slotPercentage / resolvedPercentageTotal
    : 0)
  const recipeRows = names
    .map((name) => recipes.find((recipe) => recipe.name === name))
    .filter((recipe): recipe is Recipe => Boolean(recipe))
    .map(recipeBreakdown)
  const savedCalories = recipeRows.reduce((sum, recipe) => sum + recipe.savedCalories, 0)
  const missingRecipes = names.filter((name) => !recipes.some((recipe) => recipe.name === name))

  return {
    label,
    percentage: round1(slotPercentage),
    percentageTotal: round1(resolvedPercentageTotal),
    targetCalories: round1(targetCalories),
    targetFormula: dailyCalories > 0
      ? `${Math.round(dailyCalories)} daily cal x ${round1(slotPercentage)} / ${round1(resolvedPercentageTotal)} = ${Math.round(targetCalories)} cal target`
      : 'Daily calorie target is blank, so no meal budget can be computed.',
    savedCalories: round1(savedCalories),
    deltaCalories: round1(savedCalories - targetCalories),
    recipes: recipeRows,
    missingRecipes,
  }
}
