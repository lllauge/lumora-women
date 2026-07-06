// Server-side counterpart of the plan editor's save pipeline. When the
// Recipe Library changes, every client plan that references the changed
// recipe re-syncs itself immediately — snapshot cards, portion fits, meal
// macro labels, and grocery lists — instead of waiting for Laura to open
// and re-save each plan by hand.
import type { createAdminClient } from './supabase/server'
import {
  mealRecipeNames,
  parseCoachingPlan,
  type CoachingPlanDraft,
} from './coaching-plan-schema'
import {
  normalizeRecipeName,
  syncRecipesWithLibrary,
} from './plan-library-sync'
import { fitRecipeServingMultipliers } from './meal-portion-fitting'
import {
  normalizeReferencedPlanNutrition,
} from './normalize-plan-nutrition'
import { buildGroceryList, mergeGroceryList } from './grocery-list'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

type LibraryRow = {
  name: string
  meal_type: string
  family_servings: string
  ingredients: string[]
  instructions: string[]
  notes: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fats: number | null
  fiber: number | null
}

export type PlanResyncSummary = {
  /** Plans that reference one of the changed recipes. */
  affected: number
  /** Plans successfully re-synced and saved. */
  updated: number
  failed: Array<{ clientId: string; error: string }>
}

function referencedRecipeNames(plan: CoachingPlanDraft): Set<string> {
  const names = new Set<string>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      mealRecipeNames(meal).forEach((name) => names.add(name))
    }
  }
  return names
}

/**
 * Re-sync every client plan that references any of the given recipe names.
 * Mirrors the editor's save pipeline: library snapshot → price cards at their
 * stored portion → re-fit portions to the client's macro targets → re-price
 * refitted cards → rebuild the grocery list. A plan that fails (e.g. a USDA
 * ingredient stopped matching) is left untouched and reported, so its stored
 * data stays internally consistent.
 */
export async function resyncPlansForRecipes({
  supabase,
  apiKey,
  recipeNames,
}: {
  supabase: AdminClient
  apiKey: string
  recipeNames: string[]
}): Promise<PlanResyncSummary> {
  const summary: PlanResyncSummary = { affected: 0, updated: 0, failed: [] }
  const wanted = new Set(recipeNames.map(normalizeRecipeName).filter(Boolean))
  if (wanted.size === 0) return summary

  const { data: libraryRows, error: libraryError } = await supabase
    .from('recipe_library')
    .select('name, meal_type, family_servings, ingredients, instructions, notes, calories, protein, carbs, fats, fiber')
  if (libraryError) {
    summary.failed.push({ clientId: '(library)', error: libraryError.message })
    return summary
  }
  const library = (libraryRows ?? []) as LibraryRow[]

  const { data: planRows, error: planError } = await supabase
    .from('coaching_plans')
    .select('coaching_client_id, macro_targets, meal_plan, recipes, workout_plan, grocery_list, planning_inputs, admin_notes, client_notes, status, generated_by_ai')
  if (planError) {
    summary.failed.push({ clientId: '(plans)', error: planError.message })
    return summary
  }

  for (const row of planRows ?? []) {
    const plan = parseCoachingPlan({
      macroTargets: row.macro_targets,
      mealPlan: row.meal_plan,
      recipes: row.recipes,
      workoutPlan: row.workout_plan,
      groceryList: row.grocery_list,
      adminNotes: row.admin_notes ?? '',
      clientNotes: row.client_notes ?? '',
      status: row.status,
      generatedByAi: row.generated_by_ai,
    })
    const referenced = referencedRecipeNames(plan)
    const touchesChangedRecipe = [...referenced]
      .some((name) => wanted.has(normalizeRecipeName(name)))
    if (!touchesChangedRecipe) continue

    summary.affected += 1
    const planningInputs = (row.planning_inputs ?? {}) as Record<string, string>
    try {
      let next: CoachingPlanDraft = {
        ...plan,
        recipes: syncRecipesWithLibrary(plan.recipes, library),
      }
      // First pass prices every card at its stored portion (cards whose
      // declared servings changed were reset to one declared serving).
      next = await normalizeReferencedPlanNutrition({
        plan: next,
        mealPlanStyle: planningInputs.mealPlanStyle,
        libraryRecipes: library,
        apiKey,
      })
      // Re-carve portions to the client's macro targets, then re-price the
      // cards whose portion actually moved (>0.5%, same threshold the
      // editor uses so repeat syncs settle instead of churning).
      const fitted = fitRecipeServingMultipliers(next, planningInputs)
      let refit = false
      const recipes = next.recipes.map((recipe) => {
        const target = fitted.get(recipe.name)
        if (target === undefined || recipe.ingredients.length === 0) return recipe
        const current = parseFloat(recipe.clientServingMultiplier)
        if (Number.isFinite(current) && current > 0 && Math.abs(target - current) / current < 0.005) {
          return recipe
        }
        refit = true
        return { ...recipe, clientServingMultiplier: `${target}` }
      })
      if (refit) {
        next = await normalizeReferencedPlanNutrition({
          plan: { ...next, recipes },
          mealPlanStyle: planningInputs.mealPlanStyle,
          libraryRecipes: library,
          apiKey,
        })
      }
      next = { ...next, groceryList: mergeGroceryList(next.groceryList, buildGroceryList(next)) }

      const { error: saveError } = await supabase
        .from('coaching_plans')
        .update({
          recipes: next.recipes,
          meal_plan: next.mealPlan,
          grocery_list: next.groceryList,
          updated_at: new Date().toISOString(),
        })
        .eq('coaching_client_id', row.coaching_client_id)
      if (saveError) throw new Error(saveError.message)
      summary.updated += 1
    } catch (error) {
      summary.failed.push({
        clientId: row.coaching_client_id,
        error: error instanceof Error ? error.message : 'Unknown resync failure.',
      })
    }
  }

  return summary
}
