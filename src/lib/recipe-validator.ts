import type { CoachingPlanDraft } from './coaching-plan-schema'
import { isExcludedNutritionIngredient } from './nutrition-ingredient'

// Inlined from coaching-engagement.ts so this module has no server deps and
// can be imported into the client-side CoachingPlanEditor without dragging in
// next/headers via the supabase server client.
const FDC_TOKEN = /\[fdc:\d+\]\s*/g

function cleanIngredientText(value: string): string {
  return value.replace(FDC_TOKEN, '').replace(/\s+/g, ' ').trim()
}

function ingredientGrams(value: string): number | null {
  const match = cleanIngredientText(value).match(/^(\d+(?:\.\d+)?)\s*g\b/i)
  return match ? parseFloat(match[1]) : null
}

export type RecipeIssue = {
  severity: 'error' | 'warning'
  code: 'atwater_mismatch' | 'missing_grams' | 'macros_missing'
  message: string
  ingredientLine?: string
}

export type RecipeValidationResult = {
  recipeName: string
  issues: RecipeIssue[]
}

export type PlanValidationResult = {
  ok: boolean
  recipes: RecipeValidationResult[]
}

/**
 * Lines that are intentionally weightless — seasonings used "to taste",
 * garnishes, optional ingredients. These don't need a gram value to validate.
 */
const ALLOWED_WEIGHTLESS = /\b(to taste|for garnish|for serving|for drizzling|for topping|optional|as needed|pinch)\b/i

/**
 * The Atwater system: macros must roughly multiply out to calories.
 *   calories ≈ protein × 4 + carbs × 4 + fat × 9
 * USDA and food-label energy can legitimately differ from simple 4/4/9 math
 * because of specific Atwater factors, fiber, sugar alcohols, rounding, and
 * analytical variability. A large difference deserves review, but is not by
 * itself proof that the underlying nutrient data is invalid.
 */
const ATWATER_REVIEW_THRESHOLD = 0.15

function num(value: string): number | null {
  if (!value || !value.trim()) return null
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export function validateRecipe(recipe: CoachingPlanDraft['recipes'][number]): RecipeValidationResult {
  const issues: RecipeIssue[] = []
  const cal = num(recipe.calories)
  const protein = num(recipe.protein)
  const carbs = num(recipe.carbs)
  const fats = num(recipe.fats)

  if (cal === null || protein === null || carbs === null || fats === null) {
    issues.push({
      severity: 'error',
      code: 'macros_missing',
      message: 'Recipe macros are blank. Save the recipe so USDA can calculate them.',
    })
  } else if (cal > 0) {
    const atwater = protein * 4 + carbs * 4 + fats * 9
    const drift = Math.abs(cal - atwater) / cal
    if (drift > ATWATER_REVIEW_THRESHOLD) {
      issues.push({
        severity: 'warning',
        code: 'atwater_mismatch',
        message: `Review energy: ${Math.round(cal)} database calories vs. ${Math.round(atwater)} from simple 4/4/9 math (${Math.round(drift * 100)}% difference). Database calories remain authoritative when every ingredient matched; fiber, food-specific Atwater factors, and label rounding can cause a legitimate difference.`,
      })
    }
  }

  for (const line of recipe.ingredients) {
    const cleaned = cleanIngredientText(line).trim()
    if (!cleaned) continue
    if (isExcludedNutritionIngredient(cleaned)) continue
    if (ALLOWED_WEIGHTLESS.test(cleaned)) continue
    if (ingredientGrams(line) === null) {
      issues.push({
        severity: 'error',
        code: 'missing_grams',
        message: `Ingredient has no gram weight: "${cleaned}". Without grams it contributes 0 macros to the recipe total.`,
        ingredientLine: cleaned,
      })
    }
  }

  return { recipeName: recipe.name || '(unnamed recipe)', issues }
}

export function validatePlan(plan: CoachingPlanDraft): PlanValidationResult {
  // Only validate recipes that are actually referenced by a meal — an old
  // recipe left behind in plan.recipes[] after the admin swapped it out
  // shouldn't block publishing, since the client never sees it.
  const referenced = new Set<string>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      if (meal.recipeName?.trim()) referenced.add(meal.recipeName.trim())
    }
  }
  const recipes = plan.recipes
    .filter((r) => referenced.has((r.name ?? '').trim()))
    .map((r) => validateRecipe(r))
  const ok = recipes.every((r) => r.issues.every((i) => i.severity !== 'error'))
  return { ok, recipes }
}

/** Flatten all recipe errors into one human-readable string for API responses. */
export function summarizeValidation(result: PlanValidationResult): string {
  const lines: string[] = []
  for (const r of result.recipes) {
    const errors = r.issues.filter((i) => i.severity === 'error')
    if (errors.length === 0) continue
    lines.push(`${r.recipeName}:`)
    for (const e of errors) lines.push(`  • ${e.message}`)
  }
  return lines.join('\n')
}
