import {
  calculateMacroAudit,
  type MacroCalculationAudit,
  type MacroCalculationInputs,
} from './coaching-macro-calculator'
import { mealRecipeNames, type CoachingPlanDraft, type PlanMeal } from './coaching-plan-schema'
import { clientPortionFactor } from './client-portion'
import { buildGroceryList, cleanIngredientLine, recipeCookCounts } from './grocery-list'
import {
  declaredServingMultiplier,
  resolvedServingMultiplier,
  scaleFullRecipeNutrition,
} from './nutrition-math'
import { findLibraryRecipe, type LibraryRecipeSource } from './plan-library-sync'
import {
  calculateRecipeNutritionFromUsda,
  type UsdaIngredientResult,
} from './usda/food-data'

export type AuditStatus = 'ok' | 'warning' | 'error'

type Nutrition = {
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
}

export type CalculationLibraryRecipe = LibraryRecipeSource & {
  calories: number | null
  protein: number | null
  carbs: number | null
  fats: number | null
  fiber: number | null
}

export type RecipeCalculationAudit = {
  name: string
  status: AuditStatus
  issues: string[]
  source: 'Recipe Library' | 'Plan custom recipe'
  nutritionSource: 'Live USDA ingredient calculation'
  planIngredients: string[]
  sourceIngredients: string[]
  ingredientsMatch: boolean | null
  familyServings: number
  libraryFamilyServings: number | null
  isFamilyRecipe: boolean
  portionPinned: boolean
  storedMultiplier: string
  declaredMultiplier: number
  effectiveMultiplier: number
  fullRecipe: Nutrition
  liveUsdaFullRecipe: Nutrition
  sourceVsUsdaDiffers: boolean
  recomputedServing: Nutrition
  savedServing: Nutrition
  ingredientResults: UsdaIngredientResult[]
  unmatchedIngredients: string[]
  excludedIngredients: string[]
  warnings: string[]
  calculationError: string | null
}

export type MealCalculationAudit = {
  label: string
  percentage: number
  formula: string
  targetCalories: number
  saved: Nutrition
  recomputed: Nutrition
  deltaCalories: number
  recipeNames: string[]
  missingRecipes: string[]
  status: AuditStatus
}

export type DayCalculationAudit = {
  day: string
  targetCalories: number
  savedCalories: number
  recomputedCalories: number
  deltaCalories: number
  status: AuditStatus
  meals: MealCalculationAudit[]
}

export type GroceryCalculationAudit = {
  recipeName: string
  scheduledUses: number
  portionFactor: number
  recipeEquivalents: number
  formula: string
  scaledIngredients: string[]
}

export type ClientCalculationAudit = {
  generatedAt: string
  macroCalculation: MacroCalculationAudit | null
  macroTargetsMatch: boolean | null
  savedMacroTargets: CoachingPlanDraft['macroTargets']
  recipes: RecipeCalculationAudit[]
  days: DayCalculationAudit[]
  groceries: GroceryCalculationAudit[]
  savedGroceryList: string[]
  recomputedGroceryList: string[]
  groceryListMatches: boolean
  summary: { ok: number; warning: number; error: number }
}

const ZERO_NUTRITION: Nutrition = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }

function firstNumber(value: unknown) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function nutritionFromRecipe(recipe: CoachingPlanDraft['recipes'][number]): Nutrition {
  return {
    calories: firstNumber(recipe.calories),
    protein: firstNumber(recipe.protein),
    carbs: firstNumber(recipe.carbs),
    fats: firstNumber(recipe.fats),
    fiber: firstNumber(recipe.fiber),
  }
}

function addNutrition(left: Nutrition, right: Nutrition): Nutrition {
  return {
    calories: round1(left.calories + right.calories),
    protein: round1(left.protein + right.protein),
    carbs: round1(left.carbs + right.carbs),
    fats: round1(left.fats + right.fats),
    fiber: round1(left.fiber + right.fiber),
  }
}

function sameIngredients(left: string[], right: string[]) {
  return left.length === right.length
    && left.every((ingredient, index) => ingredient.trim() === right[index]?.trim())
}

function nutritionDiffers(saved: Nutrition, computed: Nutrition) {
  const calorieTolerance = Math.max(5, computed.calories * 0.02)
  return Math.abs(saved.calories - computed.calories) > calorieTolerance
    || Math.abs(saved.protein - computed.protein) > Math.max(1, computed.protein * 0.03)
    || Math.abs(saved.carbs - computed.carbs) > Math.max(1, computed.carbs * 0.03)
    || Math.abs(saved.fats - computed.fats) > Math.max(1, computed.fats * 0.03)
}

function completeMacroInputs(raw: Record<string, unknown>): MacroCalculationInputs {
  const value = (key: string) => typeof raw[key] === 'string' ? raw[key] as string : ''
  return {
    age: value('age'), height: value('height'), weight: value('weight'), targetWeight: value('targetWeight'),
    primaryGoal: value('primaryGoal'), planGoal: value('planGoal'), mealPlanStyle: value('mealPlanStyle'),
    mealPlanStartDate: value('mealPlanStartDate'), activityLevel: value('activityLevel'), steps: value('steps'),
    strengthTraining: value('strengthTraining'), strengthTrainingDetails: value('strengthTrainingDetails'),
    workouts: value('workouts'), water: value('water'), medicalConditions: value('medicalConditions'),
    medications: value('medications'), injuries: value('injuries'), currentEating: value('currentEating'),
    allergies: value('allergies'), restrictions: value('restrictions'), favoriteFoods: value('favoriteFoods'),
    dislikedFoods: value('dislikedFoods'), eatingOut: value('eatingOut'), sleep: value('sleep'), stress: value('stress'),
    breakfastPct: value('breakfastPct'), lunchPct: value('lunchPct'), dinnerPct: value('dinnerPct'), snackPct: value('snackPct'),
  }
}

function auditStatus(issues: string[], calculationError: string | null): AuditStatus {
  if (calculationError || issues.some((issue) => /does not match|missing|unmatched|exceeds/i.test(issue))) return 'error'
  return issues.length > 0 ? 'warning' : 'ok'
}

async function auditRecipe({
  recipe,
  libraryRecipes,
  apiKey,
}: {
  recipe: CoachingPlanDraft['recipes'][number]
  libraryRecipes: CalculationLibraryRecipe[]
  apiKey: string
}): Promise<RecipeCalculationAudit> {
  const library = findLibraryRecipe(libraryRecipes, recipe.name) as CalculationLibraryRecipe | undefined
  const familyServings = firstNumber(recipe.familyServings || recipe.servings)
  const libraryFamilyServings = library ? firstNumber(library.family_servings) : null
  const isFamilyRecipe = familyServings > 1
  const declaredMultiplier = declaredServingMultiplier(familyServings, isFamilyRecipe)
  const effectiveMultiplier = recipe.portionPinned
    ? 1
    : resolvedServingMultiplier(recipe.clientServingMultiplier, familyServings, isFamilyRecipe)
  const ingredientsMatch = library ? sameIngredients(recipe.ingredients, library.ingredients) : null
  const sourceIngredients = library?.ingredients ?? recipe.ingredients
  const savedServing = nutritionFromRecipe(recipe)
  const issues: string[] = []

  if (library && !ingredientsMatch) issues.push('Plan ingredient snapshot does not match the current Recipe Library recipe.')
  if (libraryFamilyServings !== null && libraryFamilyServings !== familyServings) {
    issues.push(`Saved family serving count (${familyServings || 'blank'}) does not match the library (${libraryFamilyServings || 'blank'}).`)
  }
  if (!library && !/\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/.test(recipe.name)) {
    issues.push('Recipe is missing from the current Recipe Library.')
  }
  let ingredientResults: UsdaIngredientResult[] = []
  let unmatchedIngredients: string[] = []
  let excludedIngredients: string[] = []
  let warnings: string[] = []
  let calculationError: string | null = null
  let usdaFullRecipe: Nutrition = { ...ZERO_NUTRITION }

  try {
    const nutrition = await calculateRecipeNutritionFromUsda({
      ingredients: sourceIngredients,
      clientServingMultiplier: `${effectiveMultiplier}`,
      familyServings: recipe.familyServings || recipe.servings,
      apiKey,
    })
    ingredientResults = nutrition.ingredients
    unmatchedIngredients = nutrition.unmatchedIngredients
    excludedIngredients = nutrition.excludedIngredients
    warnings = nutrition.warnings
    usdaFullRecipe = nutrition.totalRecipe
    if (unmatchedIngredients.length > 0) issues.push(`${unmatchedIngredients.length} ingredient(s) are unmatched and excluded from calories.`)
  } catch (error) {
    calculationError = error instanceof Error ? error.message : 'Live USDA calculation failed.'
  }

  const fullRecipe: Nutrition = usdaFullRecipe
  const recomputedServing = scaleFullRecipeNutrition({ ...fullRecipe, multiplier: effectiveMultiplier })
  const sourceVsUsdaDiffers = false
  if (!calculationError && nutritionDiffers(savedServing, recomputedServing)) {
    issues.push('Saved serving calories or macros do not match the current source x effective multiplier.')
  }

  return {
    name: recipe.name,
    status: auditStatus(issues, calculationError),
    issues,
    source: library ? 'Recipe Library' : 'Plan custom recipe',
    nutritionSource: 'Live USDA ingredient calculation',
    planIngredients: recipe.ingredients,
    sourceIngredients,
    ingredientsMatch,
    familyServings,
    libraryFamilyServings,
    isFamilyRecipe,
    portionPinned: recipe.portionPinned,
    storedMultiplier: recipe.clientServingMultiplier,
    declaredMultiplier,
    effectiveMultiplier,
    fullRecipe,
    liveUsdaFullRecipe: usdaFullRecipe,
    sourceVsUsdaDiffers,
    recomputedServing,
    savedServing,
    ingredientResults,
    unmatchedIngredients,
    excludedIngredients,
    warnings,
    calculationError,
  }
}

function mealNutrition(
  meal: PlanMeal,
  lookup: Map<string, RecipeCalculationAudit>,
  kind: 'saved' | 'recomputed',
) {
  return mealRecipeNames(meal).reduce((total, name) => {
    const recipe = lookup.get(name)
    return recipe ? addNutrition(total, kind === 'saved' ? recipe.savedServing : recipe.recomputedServing) : total
  }, { ...ZERO_NUTRITION })
}

function percentageInputs(planningInputs: Record<string, unknown>) {
  const percentages = {
    breakfast: firstNumber(planningInputs.breakfastPct) || 35,
    lunch: firstNumber(planningInputs.lunchPct) || 30,
    dinner: firstNumber(planningInputs.dinnerPct) || 25,
    snack: firstNumber(planningInputs.snackPct) || 10,
  }
  const total = Object.values(percentages).reduce((sum, value) => sum + value, 0) || 100
  return { percentages, total }
}

function mealAudit({
  label,
  meal,
  percentage,
  percentageTotal,
  dailyCalories,
  recipeLookup,
}: {
  label: string
  meal: PlanMeal
  percentage: number
  percentageTotal: number
  dailyCalories: number
  recipeLookup: Map<string, RecipeCalculationAudit>
}): MealCalculationAudit {
  const recipeNames = mealRecipeNames(meal)
  const missingRecipes = recipeNames.filter((name) => !recipeLookup.has(name))
  const saved = mealNutrition(meal, recipeLookup, 'saved')
  const recomputed = mealNutrition(meal, recipeLookup, 'recomputed')
  const targetCalories = dailyCalories * percentage / percentageTotal
  const deltaCalories = recomputed.calories - targetCalories
  const tolerance = Math.max(25, targetCalories * 0.05)
  return {
    label,
    percentage,
    formula: `${dailyCalories} daily cal x ${percentage} / ${percentageTotal} total percentage points`,
    targetCalories: round1(targetCalories),
    saved,
    recomputed,
    deltaCalories: round1(deltaCalories),
    recipeNames,
    missingRecipes,
    status: missingRecipes.length > 0 || Math.abs(deltaCalories) > tolerance ? 'error' : Math.abs(deltaCalories) > 5 ? 'warning' : 'ok',
  }
}

function scaledIngredientSummary(line: string, factor: number) {
  const cleaned = cleanIngredientLine(line)
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i)
  if (!match) return `${cleaned} x ${round1(factor)}`
  return `${round1(Number(match[1]) * factor)}g ${match[2]} (${match[1]}g x ${round1(factor)})`
}

export async function buildClientCalculationAudit({
  plan,
  planningInputs,
  libraryRecipes,
  apiKey,
}: {
  plan: CoachingPlanDraft
  planningInputs: Record<string, unknown>
  libraryRecipes: CalculationLibraryRecipe[]
  apiKey: string
}): Promise<ClientCalculationAudit> {
  const referencedNames = new Set<string>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      mealRecipeNames(meal).forEach((name) => referencedNames.add(name))
    }
  }
  const referencedRecipes = plan.recipes.filter((recipe) => referencedNames.has(recipe.name))
  const recipes = await Promise.all(referencedRecipes.map((recipe) => auditRecipe({ recipe, libraryRecipes, apiKey })))
  const recipeLookup = new Map(recipes.map((recipe) => [recipe.name, recipe]))
  const dailyCalories = firstNumber(plan.macroTargets.calories)
  const { percentages, total: percentageTotal } = percentageInputs(planningInputs)

  const days = plan.mealPlan.map((day, index) => {
    const snackCount = Math.max(1, day.snacks.length)
    const meals = [
      mealAudit({ label: 'Breakfast', meal: day.breakfast, percentage: percentages.breakfast, percentageTotal, dailyCalories, recipeLookup }),
      mealAudit({ label: 'Lunch', meal: day.lunch, percentage: percentages.lunch, percentageTotal, dailyCalories, recipeLookup }),
      mealAudit({ label: 'Dinner', meal: day.dinner, percentage: percentages.dinner, percentageTotal, dailyCalories, recipeLookup }),
      ...day.snacks.map((meal, snackIndex) => mealAudit({
        label: day.snacks.length > 1 ? `Snack ${snackIndex + 1}` : 'Snack',
        meal,
        percentage: percentages.snack / snackCount,
        percentageTotal,
        dailyCalories,
        recipeLookup,
      })),
    ]
    const savedCalories = round1(meals.reduce((sum, meal) => sum + meal.saved.calories, 0))
    const recomputedCalories = round1(meals.reduce((sum, meal) => sum + meal.recomputed.calories, 0))
    const deltaCalories = round1(recomputedCalories - dailyCalories)
    return {
      day: day.day || `Day ${index + 1}`,
      targetCalories: dailyCalories,
      savedCalories,
      recomputedCalories,
      deltaCalories,
      status: meals.some((meal) => meal.status === 'error') || Math.abs(deltaCalories) > Math.max(50, dailyCalories * 0.05)
        ? 'error' as const
        : Math.abs(deltaCalories) > 15 ? 'warning' as const : 'ok' as const,
      meals,
    }
  })

  const cookCounts = recipeCookCounts(plan, { clientPortionsOnly: true })
  const useCounts = recipeCookCounts(plan)
  const groceries = [...cookCounts].map(([recipeName, recipeEquivalents]) => {
    const recipe = plan.recipes.find((candidate) => candidate.name === recipeName)
    const scheduledUses = useCounts.get(recipeName) ?? 0
    const portionFactor = recipe ? clientPortionFactor(recipe, false) : 1
    return {
      recipeName,
      scheduledUses,
      portionFactor,
      recipeEquivalents: round1(recipeEquivalents),
      formula: `${scheduledUses} scheduled use(s) x ${round1(portionFactor)} client portion of full recipe`,
      scaledIngredients: (recipe?.ingredients ?? []).map((line) => scaledIngredientSummary(line, recipeEquivalents)),
    }
  })
  const recomputedGroceryList = buildGroceryList(plan, { clientPortionsOnly: true })
  const groceryListMatches = plan.groceryList.length === recomputedGroceryList.length
    && plan.groceryList.every((line, index) => line === recomputedGroceryList[index])

  const macroCalculation = calculateMacroAudit(completeMacroInputs(planningInputs))
  const macroTargetsMatch = macroCalculation
    ? ['calories', 'protein', 'carbs', 'fats', 'fiber'].every((key) => (
      firstNumber(plan.macroTargets[key as keyof typeof plan.macroTargets])
      === firstNumber(macroCalculation.targets[key as keyof typeof macroCalculation.targets])
    ))
    : null
  const statuses: AuditStatus[] = [
    macroTargetsMatch === true ? 'ok' : 'error',
    ...recipes.map((recipe) => recipe.status),
    ...days.map((day) => day.status),
    groceryListMatches ? 'ok' : 'error',
  ]
  const summary = statuses.reduce((counts, status) => ({ ...counts, [status]: counts[status] + 1 }), { ok: 0, warning: 0, error: 0 })

  return {
    generatedAt: new Date().toISOString(),
    macroCalculation,
    macroTargetsMatch,
    savedMacroTargets: plan.macroTargets,
    recipes,
    days,
    groceries,
    savedGroceryList: plan.groceryList,
    recomputedGroceryList,
    groceryListMatches,
    summary,
  }
}
