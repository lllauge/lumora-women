import type { CoachingPlanDraft } from './coaching-plan-schema'

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
 * A recipe whose stored calories diverge from the macro sum by more than 7%
 * is almost always a parse failure — some ingredient computed grams=0 and
 * its macros silently dropped out.
 */
const ATWATER_TOLERANCE = 0.07

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
    if (drift > ATWATER_TOLERANCE) {
      const direction = atwater < cal ? 'fewer' : 'more'
      issues.push({
        severity: 'error',
        code: 'atwater_mismatch',
        message: `Macros don't add up to calories: ${Math.round(atwater)} cal from P/C/F vs. ${Math.round(cal)} stored (${Math.round(drift * 100)}% off, expected within ${Math.round(ATWATER_TOLERANCE * 100)}%). Usually means one or more ingredients failed to parse and is missing ${direction} macros.`,
      })
    }
  }

  for (const line of recipe.ingredients) {
    const cleaned = cleanIngredientText(line).trim()
    if (!cleaned) continue
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
  const recipes = plan.recipes.map((r) => validateRecipe(r))
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
