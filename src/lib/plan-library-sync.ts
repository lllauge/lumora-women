// Keeps plan recipe cards in step with the Recipe Library. Plan recipes are
// snapshots taken when a recipe is dropped into a meal slot; they go stale
// when the library is edited afterwards. Pure module (no server or React
// deps) so the sync rules can be unit tested.
import type { CoachingPlanDraft } from './coaching-plan-schema'

type PlanRecipe = CoachingPlanDraft['recipes'][number]

/** The minimal library shape the sync needs; matches the recipe_library row. */
export type LibraryRecipeSource = {
  name: string
  meal_type: string
  family_servings: string
  ingredients: string[]
  instructions: string[]
  notes: string
}

const CUSTOM_SLOT_RECIPE = /\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/

/** Custom per-slot foods ("Custom lunch (d1-lunch)") have no library counterpart. */
export function isCustomSlotRecipeName(name: string) {
  return CUSTOM_SLOT_RECIPE.test(name)
}

/**
 * Library lookups must survive cosmetic name drift — plans have shipped with
 * cards like "overnight oats - Blueberry" pointing at the library's
 * "Overnight oats - Blueberry", and an exact-match lookup silently stops
 * syncing (and stops using the library's stored paste-mode macros).
 */
export function normalizeRecipeName(name: string) {
  return name.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function findLibraryRecipe<T extends { name: string }>(
  libraryRecipes: T[],
  planRecipeName: string,
): T | undefined {
  const wanted = normalizeRecipeName(planRecipeName)
  if (!wanted) return undefined
  return libraryRecipes.find((candidate) => normalizeRecipeName(candidate.name) === wanted)
}

function firstNumber(value: string | undefined) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

/**
 * Replace a plan card's snapshot fields with the current library version.
 *
 * The client's portion multiplier is a share of the pot carved against the
 * recipe as it looked when the portion was fitted. If the library's declared
 * serving count changed since then (e.g. the recipe was rescaled from 4 to 6
 * servings), that share now describes a different amount of food — keeping it
 * silently changes the client's calories. Clear it so the nutrition pipeline
 * falls back to one declared serving and the portion fitter re-carves it to
 * the client's targets.
 */
function syncRecipeCard(recipe: PlanRecipe, library: LibraryRecipeSource): PlanRecipe {
  const previousServings = firstNumber(recipe.familyServings || recipe.servings)
  const libraryServings = firstNumber(library.family_servings)
  const servingsChanged = libraryServings > 0 && previousServings > 0
    && libraryServings !== previousServings

  return {
    ...recipe,
    mealType: library.meal_type || recipe.mealType,
    servings: library.family_servings || recipe.servings,
    familyServings: library.family_servings || recipe.familyServings,
    ingredients: [...library.ingredients],
    instructions: [...library.instructions],
    notes: library.notes || recipe.notes,
    ...(servingsChanged
      ? {
        clientServingMultiplier: '',
        clientServing: '',
        clientServingGrams: '',
        clientServingMeasure: '',
        clientServingBreakdown: '',
      }
      : {}),
  }
}

/** Re-sync every library-backed plan card; custom slot cards pass through untouched. */
export function syncRecipesWithLibrary(
  recipes: PlanRecipe[],
  libraryRecipes: LibraryRecipeSource[],
): PlanRecipe[] {
  if (libraryRecipes.length === 0) return recipes
  return recipes.map((recipe) => {
    if (isCustomSlotRecipeName(recipe.name)) return recipe
    const library = findLibraryRecipe(libraryRecipes, recipe.name)
    return library ? syncRecipeCard(recipe, library) : recipe
  })
}
