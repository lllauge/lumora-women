import {
  mealRecipeNames,
  type CoachingPlanDraft,
  type PlanMeal,
} from './coaching-plan-schema'
import { isExcludedNutritionIngredient } from './nutrition-ingredient'
import { declaredServingMultiplier, scaleFullRecipeNutrition } from './nutrition-math'
import { calculateRecipeNutritionFromUsda } from './usda/food-data'

export type RecipeLibraryNutrition = {
  name: string
  ingredients?: string[]
  calories: number | null
  protein: number | null
  carbs: number | null
  fats: number | null
  fiber: number | null
}

export class NutritionNormalizationError extends Error {
  readonly recipeName: string

  constructor(recipeName: string, message: string) {
    super(`${recipeName}: ${message}`)
    this.name = 'NutritionNormalizationError'
    this.recipeName = recipeName
  }
}

function firstNumber(value: string | undefined) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function sameIngredients(left: string[], right: string[] | undefined) {
  if (!right || left.length !== right.length) return false
  return left.every((ingredient, index) => ingredient.trim() === right[index]?.trim())
}

function recipeTotals(meal: PlanMeal, recipes: CoachingPlanDraft['recipes']) {
  return mealRecipeNames(meal).reduce((total, name) => {
    const recipe = recipes.find((candidate) => candidate.name === name)
    if (!recipe) return total
    return {
      calories: total.calories + firstNumber(recipe.calories),
      protein: total.protein + firstNumber(recipe.protein),
      carbs: total.carbs + firstNumber(recipe.carbs),
      fats: total.fats + firstNumber(recipe.fats),
      fiber: total.fiber + firstNumber(recipe.fiber),
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 })
}

function mealMacroLabel(meal: PlanMeal, recipes: CoachingPlanDraft['recipes']) {
  const total = recipeTotals(meal, recipes)
  if (!total.calories && !total.protein && !total.carbs && !total.fats && !total.fiber) return ''
  return `${Math.round(total.calories)} cal, ${round1(total.protein)}g protein, ${round1(total.carbs)}g carbs, ${round1(total.fats)}g fats, ${round1(total.fiber)}g fiber`
}

/**
 * Rebuild every referenced recipe and meal total from an authoritative source
 * immediately before persistence. The API never trusts client-calculated
 * serving macros, which prevents already-scaled values from being divided by
 * family servings a second time.
 */
export async function normalizeReferencedPlanNutrition({
  plan,
  mealPlanStyle,
  libraryRecipes,
  apiKey,
}: {
  plan: CoachingPlanDraft
  mealPlanStyle: string | undefined
  libraryRecipes: RecipeLibraryNutrition[]
  apiKey: string
}): Promise<CoachingPlanDraft> {
  const referenced = new Set<string>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      mealRecipeNames(meal).forEach((name) => referenced.add(name))
    }
  }

  const libraryByName = new Map(libraryRecipes.map((recipe) => [recipe.name, recipe]))
  const individualOnly = mealPlanStyle === 'individual_only'

  const recipes = await Promise.all(plan.recipes.map(async (recipe) => {
    if (!referenced.has(recipe.name) || recipe.ingredients.length === 0) return recipe

    const familyServings = firstNumber(recipe.familyServings || recipe.servings)
    const multiplier = declaredServingMultiplier(
      familyServings,
      !individualOnly && familyServings > 1,
    )
    const customSlot = /\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/.test(recipe.name)
    const hasExclusions = recipe.ingredients.some(isExcludedNutritionIngredient)
    const library = customSlot ? undefined : libraryByName.get(recipe.name)

    if (
      library?.calories
      && library.calories > 0
      && !hasExclusions
      && sameIngredients(recipe.ingredients, library.ingredients)
    ) {
      const serving = scaleFullRecipeNutrition({
        calories: library.calories,
        protein: library.protein ?? 0,
        carbs: library.carbs ?? 0,
        fats: library.fats ?? 0,
        fiber: library.fiber ?? 0,
        multiplier,
      })
      return {
        ...recipe,
        clientServingMultiplier: `${multiplier}`,
        calories: `${serving.calories}`,
        protein: `${serving.protein}g`,
        carbs: `${serving.carbs}g`,
        fats: `${serving.fats}g`,
        fiber: `${serving.fiber}g`,
      }
    }

    const nutrition = await calculateRecipeNutritionFromUsda({
      ingredients: recipe.ingredients,
      clientServingMultiplier: `${multiplier}`,
      familyServings: recipe.familyServings || recipe.servings,
      apiKey,
    })

    if (nutrition.ingredients.length === 0 || !nutrition.totalRecipe.calories) {
      throw new NutritionNormalizationError(recipe.name, 'No usable nutrition data was returned.')
    }
    if (nutrition.unmatchedIngredients.length > 0) {
      throw new NutritionNormalizationError(
        recipe.name,
        `These ingredients could not be matched safely: ${nutrition.unmatchedIngredients.join('; ')}`,
      )
    }

    return {
      ...recipe,
      clientServingMultiplier: `${nutrition.clientServingMultiplier}`,
      clientServingGrams: `${nutrition.clientServingGrams}g`,
      clientServingMeasure: nutrition.clientServingMeasure,
      clientServingBreakdown: nutrition.clientServingBreakdown,
      clientServing: nutrition.clientServingBreakdown || `${nutrition.clientServingGrams}g`,
      calories: `${nutrition.clientServing.calories}`,
      protein: `${nutrition.clientServing.protein}g`,
      carbs: `${nutrition.clientServing.carbs}g`,
      fats: `${nutrition.clientServing.fats}g`,
      fiber: `${nutrition.clientServing.fiber}g`,
    }
  }))

  const updateMeal = (meal: PlanMeal): PlanMeal => ({
    ...meal,
    macros: mealMacroLabel(meal, recipes),
  })

  return {
    ...plan,
    recipes,
    mealPlan: plan.mealPlan.map((day) => ({
      ...day,
      breakfast: updateMeal(day.breakfast),
      lunch: updateMeal(day.lunch),
      dinner: updateMeal(day.dinner),
      snacks: day.snacks.map(updateMeal),
    })),
  }
}
