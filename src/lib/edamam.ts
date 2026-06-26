/**
 * Edamam Nutrition Analysis API wrapper.
 *
 * Endpoint: POST /api/nutrition-details?app_id=...&app_key=...
 * Docs: https://developer.edamam.com/edamam-docs-nutrition-api
 *
 * Send a list of ingredient strings ("1.5 lbs chicken breast", "1 can drained
 * black beans", etc.) and Edamam returns per-ingredient grams and macros that
 * we use directly — no USDA matching, no OpenAI parsing, no edge-case patches.
 */

const EDAMAM_URL = 'https://api.edamam.com/api/nutrition-details'

type EdamamNutrient = { label?: string; quantity?: number; unit?: string }

type EdamamParsedIngredient = {
  quantity?: number
  measure?: string
  food?: string
  weight?: number // grams
  retainedWeight?: number
  foodMatch?: string
  nutrients?: Record<string, EdamamNutrient>
}

type EdamamIngredient = {
  text?: string
  parsed?: EdamamParsedIngredient[]
}

type EdamamResponse = {
  calories?: number
  totalWeight?: number
  totalNutrients?: Record<string, EdamamNutrient>
  ingredients?: EdamamIngredient[]
}

export type EdamamLineMacros = {
  text: string
  food: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  /** True when Edamam couldn't parse this line at all. */
  unparsed: boolean
}

export type EdamamRecipeMacros = {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFats: number
  totalFiber: number
  totalGrams: number
  ingredients: EdamamLineMacros[]
}

function nutrient(map: Record<string, EdamamNutrient> | undefined, key: string): number {
  const value = map?.[key]?.quantity
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function hasEdamamCredentials(): boolean {
  return !!(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY)
}

export async function analyzeIngredientsWithEdamam(
  ingredientLines: string[],
  recipeTitle = 'Imported recipe',
): Promise<EdamamRecipeMacros> {
  const appId = process.env.EDAMAM_APP_ID
  const appKey = process.env.EDAMAM_APP_KEY
  if (!appId || !appKey) {
    throw new Error('EDAMAM_APP_ID and EDAMAM_APP_KEY must be set in the environment.')
  }

  if (ingredientLines.length === 0) {
    throw new Error('No ingredients to analyze.')
  }

  const url = new URL(EDAMAM_URL)
  url.searchParams.set('app_id', appId)
  url.searchParams.set('app_key', appKey)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: recipeTitle, ingr: ingredientLines }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    // 555 = recipe failed Edamam's quality check (e.g. unrecognized ingredient,
    // weight can't be assigned). Surface that as a clear error to the admin.
    if (response.status === 555) {
      throw new Error('Edamam couldn\'t make sense of one or more ingredients. Try simplifying the wording (e.g. "1 cup brown rice, cooked" instead of "1 cup brown rice prepared with chicken broth").')
    }
    throw new Error(`Edamam returned ${response.status}: ${text.slice(0, 200)}`)
  }

  const data = await response.json() as EdamamResponse

  const ingredients: EdamamLineMacros[] = (data.ingredients ?? []).map((line, i) => {
    const parsed = line.parsed?.[0]
    const text = line.text ?? ingredientLines[i] ?? ''
    if (!parsed) {
      return { text, food: text, grams: 0, calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, unparsed: true }
    }
    return {
      text,
      food: parsed.foodMatch || parsed.food || text,
      grams: typeof parsed.weight === 'number' ? Math.round(parsed.weight * 10) / 10 : 0,
      calories: Math.round(nutrient(parsed.nutrients, 'ENERC_KCAL')),
      protein: Math.round(nutrient(parsed.nutrients, 'PROCNT') * 10) / 10,
      carbs: Math.round(nutrient(parsed.nutrients, 'CHOCDF') * 10) / 10,
      fats: Math.round(nutrient(parsed.nutrients, 'FAT') * 10) / 10,
      fiber: Math.round(nutrient(parsed.nutrients, 'FIBTG') * 10) / 10,
      unparsed: false,
    }
  })

  return {
    totalCalories: Math.round(data.calories ?? 0),
    totalProtein: Math.round(nutrient(data.totalNutrients, 'PROCNT') * 10) / 10,
    totalCarbs: Math.round(nutrient(data.totalNutrients, 'CHOCDF') * 10) / 10,
    totalFats: Math.round(nutrient(data.totalNutrients, 'FAT') * 10) / 10,
    totalFiber: Math.round(nutrient(data.totalNutrients, 'FIBTG') * 10) / 10,
    totalGrams: Math.round((data.totalWeight ?? 0) * 10) / 10,
    ingredients,
  }
}
