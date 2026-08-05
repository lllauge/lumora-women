import {
  isSlotRecipeName,
  mealRecipeNames,
  normalizedSlotRecipeName,
  stripSlotRecipeSuffixes,
  type CoachingPlanDraft,
  withMealRecipeNames,
} from './coaching-plan-schema.ts'
import {
  findLibraryRecipe,
  isCustomSlotRecipeName,
  type LibraryRecipeSource,
} from './plan-library-sync.ts'

type PlanRecipe = CoachingPlanDraft['recipes'][number]

function libraryRecipeToPlanRecipe(library: LibraryRecipeSource): PlanRecipe {
  return {
    name: library.name,
    mealType: library.meal_type,
    servings: library.family_servings,
    familyServings: library.family_servings,
    clientServing: '',
    clientServingMultiplier: '',
    portionPinned: false,
    clientServingGrams: '',
    clientServingMeasure: '',
    clientServingBreakdown: '',
    prepTime: '',
    cookTime: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    fiber: '',
    ingredients: [...library.ingredients],
    instructions: [...library.instructions],
    swaps: [],
    notes: library.notes,
  }
}

/**
 * A recipe dropped into a meal slot must be its own plan card. Otherwise one
 * copied/shared recipe multiplier can make Tuesday exact while Monday still
 * carries Tuesday's portion. This normalizes old plans and future edits by
 * assigning every non-custom recipe occurrence to "Recipe (dN-slot)".
 */
export function slotLinkRecipeAssignments(
  plan: CoachingPlanDraft,
  libraryRecipes: LibraryRecipeSource[] = [],
): CoachingPlanDraft {
  let changed = false
  let recipes = [...plan.recipes]

  const clearLegacyPin = (name: string) => {
    const index = recipes.findIndex((recipe) => recipe.name === name)
    if (index < 0 || !recipes[index].portionPinned) return
    changed = true
    recipes = recipes.map((recipe, recipeIndex) => (
      recipeIndex === index ? { ...recipe, portionPinned: false } : recipe
    ))
  }

  const linkedName = (name: string, slotKey: string) => {
    if (isCustomSlotRecipeName(name) || isSlotRecipeName(name, slotKey)) {
      clearLegacyPin(name)
      return name
    }

    const baseName = stripSlotRecipeSuffixes(name)
    const library = findLibraryRecipe(libraryRecipes, name)
    const existing = recipes.find((recipe) => recipe.name === name)
      ?? recipes.find((recipe) => stripSlotRecipeSuffixes(recipe.name) === baseName)
    if (!library && !existing) return name

    const label = library?.name ?? existing?.name ?? baseName
    const slotRecipeName = normalizedSlotRecipeName(label, baseName || 'Recipe', slotKey)
    if (name === slotRecipeName) return name

    changed = true
    if (!recipes.some((recipe) => recipe.name === slotRecipeName)) {
      const source = existing ?? (library ? libraryRecipeToPlanRecipe(library) : null)
      if (!source) return slotRecipeName
      recipes.push({
        ...source,
        name: slotRecipeName,
        portionPinned: false,
        clientServing: '',
        clientServingMultiplier: '',
        clientServingGrams: '',
        clientServingMeasure: '',
        clientServingBreakdown: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        fiber: '',
        ingredients: [...(existing?.ingredients ?? library?.ingredients ?? source.ingredients)],
        instructions: [...(existing?.instructions ?? library?.instructions ?? source.instructions)],
        swaps: [...(existing?.swaps ?? source.swaps ?? [])],
      })
    }
    return slotRecipeName
  }

  const mealPlan = plan.mealPlan.map((day, dayIndex) => {
    const linkMeal = (meal: CoachingPlanDraft['mealPlan'][number]['breakfast'], slotKey: string) => {
      const names = mealRecipeNames(meal)
      if (names.length === 0) return meal
      const nextNames = names.map((name) => linkedName(name, slotKey))
      return nextNames.some((name, index) => name !== names[index])
        ? withMealRecipeNames(meal, nextNames)
        : meal
    }
    return {
      ...day,
      breakfast: linkMeal(day.breakfast, `d${dayIndex + 1}-breakfast`),
      lunch: linkMeal(day.lunch, `d${dayIndex + 1}-lunch`),
      dinner: linkMeal(day.dinner, `d${dayIndex + 1}-dinner`),
      snacks: day.snacks.map((snack, snackIndex) => linkMeal(snack, `d${dayIndex + 1}-snack${snackIndex}`)),
    }
  })

  return changed ? { ...plan, recipes, mealPlan } : plan
}
