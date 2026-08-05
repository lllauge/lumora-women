import { analyzeIngredientsWithEdamam, type EdamamLineMacros } from '../edamam.ts'
import {
  inferredDiscardedBrineIndexes,
  setIngredientNutritionExcluded,
} from '../nutrition-ingredient.ts'
import { requestOpenAiJson } from '../openai-responses.ts'

export type ImportedIngredient = {
  /** The original ingredient string from the recipe (e.g. "1.5 lbs chicken breast"). */
  raw: string
  /** The food Edamam recognized (e.g. "chicken breast"). */
  food: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  /** True when Edamam couldn't parse this line — admin should edit it. */
  unparsed: boolean
  /** Final ingredient string in the editor's expected format. */
  line: string
}

export type ImportedRecipe = {
  title: string
  servings: number
  prepTime: string
  cookTime: string
  ingredients: ImportedIngredient[]
  instructions: string[]
  sourceUrl: string
  notes: string
  totals: {
    calories: number
    protein: number
    carbs: number
    fats: number
    fiber: number
    grams: number
  }
  originalTotals: {
    calories: number
    protein: number
    carbs: number
    fats: number
    fiber: number
    grams: number
  } | null
  calculatedTotals: {
    calories: number
    protein: number
    carbs: number
    fats: number
    fiber: number
    grams: number
  }
  nutritionSource: 'calculated'
}

const FETCH_TIMEOUT_MS = 12_000
const READER_FETCH_TIMEOUT_MS = 25_000
const FETCH_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const READER_BASE_URL = 'https://r.jina.ai/'

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': FETCH_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  }, FETCH_TIMEOUT_MS)

  if (response.ok) return await response.text()

  // Some recipe publishers block cloud-hosted requests (EatingWell currently
  // responds with 402) even though the same public page loads in a browser.
  // Jina Reader fetches the public page and returns Markdown, which the LLM
  // extraction fallback below can parse just like cleaned HTML.
  if ([402, 403, 429].includes(response.status)) {
    try {
      const readerResponse = await fetchWithTimeout(`${READER_BASE_URL}${url}`, {
        headers: {
          Accept: 'text/plain',
          'X-Timeout': '20',
        },
        redirect: 'follow',
      }, READER_FETCH_TIMEOUT_MS)
      if (readerResponse.ok) return await readerResponse.text()
    } catch {
      // Preserve the publisher's useful status code when the fallback is down.
    }
  }

  throw new Error(`Site returned ${response.status}`)
}

type JsonLdRecipe = {
  name?: string
  recipeYield?: string | number | string[]
  recipeIngredient?: string[]
  ingredients?: string[]
  recipeInstructions?: unknown
  nutrition?: JsonLdNutrition
  prepTime?: string
  cookTime?: string
  totalTime?: string
}

type JsonLdNutrition = {
  calories?: string | number
  proteinContent?: string | number
  carbohydrateContent?: string | number
  fatContent?: string | number
  fiberContent?: string | number
}

type ExtractedRecipe = {
  title: string
  servings: number
  prepTime: string
  cookTime: string
  ingredients: string[]
  instructions: string[]
}

export function extractJsonLdRecipe(html: string): JsonLdRecipe | null {
  // Recipe sites embed schema.org/Recipe as JSON-LD in <script type="application/ld+json">.
  // Some sites nest the Recipe under @graph or list multiple types — handle both.
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []
  const recipes: JsonLdRecipe[] = []
  for (const block of scripts) {
    const inner = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(inner)
    } catch {
      continue
    }
    const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
    for (const entry of candidates) {
      recipes.push(...findRecipeNodes(entry))
    }
  }
  return recipes.find((recipe) => recipe.nutrition)
    ?? recipes.find((recipe) => (recipe.recipeIngredient ?? recipe.ingredients ?? []).length > 0)
    ?? recipes[0]
    ?? null
}

function findRecipeNodes(node: unknown): JsonLdRecipe[] {
  if (!node || typeof node !== 'object') return []
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
  const recipes: JsonLdRecipe[] = isRecipe ? [obj as JsonLdRecipe] : []
  const graph = obj['@graph']
  if (Array.isArray(graph)) {
    for (const child of graph) {
      recipes.push(...findRecipeNodes(child))
    }
  }
  return recipes
}

function parseServings(value: JsonLdRecipe['recipeYield']): number {
  if (!value) return 4
  if (typeof value === 'number') return value
  const text = Array.isArray(value) ? value[0] : value
  const match = String(text).match(/\d+/)
  return match ? Number(match[0]) : 4
}

function parseNutritionAmount(value: string | number | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (!value) return null
  const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const amount = Number(match[0])
  return Number.isFinite(amount) ? amount : null
}

export function scaleSiteNutrition(
  nutrition: JsonLdNutrition | undefined,
  servings: number,
): Partial<ImportedRecipe['totals']> {
  if (!nutrition || servings <= 0) return {}
  const scaled = {
    calories: parseNutritionAmount(nutrition.calories),
    protein: parseNutritionAmount(nutrition.proteinContent),
    carbs: parseNutritionAmount(nutrition.carbohydrateContent),
    fats: parseNutritionAmount(nutrition.fatContent),
    fiber: parseNutritionAmount(nutrition.fiberContent),
  }
  return {
    ...(scaled.calories !== null ? { calories: Math.round(scaled.calories * servings) } : {}),
    ...(scaled.protein !== null ? { protein: Math.round(scaled.protein * servings * 10) / 10 } : {}),
    ...(scaled.carbs !== null ? { carbs: Math.round(scaled.carbs * servings * 10) / 10 } : {}),
    ...(scaled.fats !== null ? { fats: Math.round(scaled.fats * servings * 10) / 10 } : {}),
    ...(scaled.fiber !== null ? { fiber: Math.round(scaled.fiber * servings * 10) / 10 } : {}),
  }
}

function completeTotals(
  totals: Partial<ImportedRecipe['totals']>,
  grams: number,
): ImportedRecipe['totals'] | null {
  if (totals.calories == null) return null
  return {
    calories: totals.calories,
    protein: totals.protein ?? 0,
    carbs: totals.carbs ?? 0,
    fats: totals.fats ?? 0,
    fiber: totals.fiber ?? 0,
    grams,
  }
}

export function extractVisibleNutrition(html: string): JsonLdNutrition | null {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  function amount(label: RegExp): string | undefined {
    const match = text.match(label)
    return match?.[1]
  }

  const nutrition = {
    calories: amount(/\bCalories?\s*:\s*([0-9]+(?:\.[0-9]+)?)/i),
    proteinContent: amount(/\bProtein\s*:\s*([0-9]+(?:\.[0-9]+)?)/i),
    carbohydrateContent: amount(/\bCarbohydrates?\s*:\s*([0-9]+(?:\.[0-9]+)?)/i),
    fatContent: amount(/(?:^|\s)Fat\s*:\s*([0-9]+(?:\.[0-9]+)?)/i),
    fiberContent: amount(/\bFiber\s*:\s*([0-9]+(?:\.[0-9]+)?)/i),
  }

  if (!nutrition.calories) return null
  const macroCount = [nutrition.proteinContent, nutrition.carbohydrateContent, nutrition.fatContent, nutrition.fiberContent]
    .filter(Boolean)
    .length
  return macroCount >= 2 ? nutrition : null
}

function parseInstructions(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return value.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (!Array.isArray(value)) return []
  return value.flatMap((step) => {
    if (typeof step === 'string') return [step.trim()]
    if (step && typeof step === 'object' && 'text' in step && typeof (step as { text: unknown }).text === 'string') {
      return [(step as { text: string }).text.trim()]
    }
    if (step && typeof step === 'object' && 'itemListElement' in step) {
      return parseInstructions((step as { itemListElement: unknown }).itemListElement)
    }
    return []
  }).filter(Boolean)
}

function parseDuration(iso: string | undefined): string {
  // ISO 8601 durations: PT15M, PT1H30M, etc. Convert to "15 min" / "1 hr 30 min".
  if (!iso) return ''
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso)
  if (!match) return ''
  const hours = match[1] ? Number(match[1]) : 0
  const minutes = match[2] ? Number(match[2]) : 0
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hr`)
  if (minutes > 0) parts.push(`${minutes} min`)
  return parts.join(' ')
}

const EXTRACT_INSTRUCTIONS = `Extract the recipe from this HTML page.

Return ONLY valid JSON with this exact shape: { "title": string, "servings": number, "prepTime": string, "cookTime": string, "ingredients": string[], "instructions": string[] }

- ingredients: each item should be a full ingredient line as written on the page (e.g. "1 1/2 cans black beans, drained and rinsed"). Keep the original quantity wording.
- instructions: each step as a separate string.
- prepTime / cookTime: short human strings like "15 min" or "1 hr 30 min". Empty string if unknown.
- servings: integer. Default to 4 if unclear.`

const ExtractedRecipeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'servings', 'prepTime', 'cookTime', 'ingredients', 'instructions'],
  properties: {
    title: { type: 'string' },
    servings: { type: 'number' },
    prepTime: { type: 'string' },
    cookTime: { type: 'string' },
    ingredients: { type: 'array', items: { type: 'string' } },
    instructions: { type: 'array', items: { type: 'string' } },
  },
} as const

async function extractRecipeWithOpenAI(html: string, openAiKey: string): Promise<ExtractedRecipe> {
  // Strip scripts and trim to keep prompt size sane.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Reader fallbacks include navigation before the recipe. EatingWell's
    // ingredient list, for example, begins around character 16,000.
    .slice(0, 32_000)

  return requestOpenAiJson<ExtractedRecipe>({
    apiKey: openAiKey,
    instructions: EXTRACT_INSTRUCTIONS,
    schemaName: 'recipe_url_extract',
    schema: ExtractedRecipeSchema,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: cleaned }],
      },
    ],
  })
}

/**
 * Convert one Edamam line into the editor's [fdc:..] gram-prefixed format.
 * Edamam doesn't return FDC IDs, so we omit the prefix — the recipe save
 * path uses the inline calories/macros from the recipe totals, not per-line
 * USDA lookup, for Edamam-imported recipes.
 */
function formatLine(line: EdamamLineMacros): string {
  const grams = Math.max(0, Math.round(line.grams * 10) / 10)
  const food = ingredientNameFromRaw(line.text) || line.food || 'ingredient'
  return `${grams}g ${food}`
}

const LEADING_QUANTITY = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`
const LEADING_QUANTITY_RE = new RegExp(String.raw`^${LEADING_QUANTITY}(?:\s*(?:to|-|–)\s*${LEADING_QUANTITY})?\s*`, 'i')
const LEADING_MEASURE_RE = /^(?:(?:to|or)\s+)?(?:cups?|c|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|large|medium|small|cloves?)\s+/i

export function ingredientNameFromRaw(raw: string): string {
  let text = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  text = text.replace(LEADING_QUANTITY_RE, '').trim()
  while (LEADING_MEASURE_RE.test(text)) {
    text = text.replace(LEADING_MEASURE_RE, '').trim()
  }

  return text
    .replace(/^of\s+/i, '')
    .replace(/,\s*(halved|sliced|cut|cored|minced|chopped|for garnish|drained|rinsed|raw|fresh|dried).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function importRecipeFromUrl(
  url: string,
  openAiKey: string,
): Promise<ImportedRecipe> {
  const html = await fetchHtml(url)

  // Prefer JSON-LD when present — deterministic and free of LLM drift.
  let title = ''
  let servings = 4
  let prepTime = ''
  let cookTime = ''
  let ingredientStrings: string[] = []
  let instructions: string[] = []
  let siteNutrition: Partial<ImportedRecipe['totals']> = {}
  let siteNutritionRaw: JsonLdNutrition | null = null

  const jsonLd = extractJsonLdRecipe(html)
  if (jsonLd) {
    title = String(jsonLd.name ?? '').trim()
    servings = parseServings(jsonLd.recipeYield)
    siteNutritionRaw = jsonLd.nutrition ?? null
    prepTime = parseDuration(jsonLd.prepTime)
    cookTime = parseDuration(jsonLd.cookTime)
    ingredientStrings = (jsonLd.recipeIngredient ?? jsonLd.ingredients ?? []).map((s) => String(s).trim()).filter(Boolean)
    instructions = parseInstructions(jsonLd.recipeInstructions)
  }

  // Fall back to an LLM extraction when the page has no structured data.
  if (ingredientStrings.length === 0) {
    const llm = await extractRecipeWithOpenAI(html, openAiKey)
    title = title || llm.title.trim() || 'Imported recipe'
    if (!servings || servings <= 0) servings = llm.servings > 0 ? llm.servings : 4
    if (!prepTime) prepTime = llm.prepTime.trim()
    if (!cookTime) cookTime = llm.cookTime.trim()
    ingredientStrings = llm.ingredients.map((s) => s.trim()).filter(Boolean)
    if (instructions.length === 0) instructions = llm.instructions.map((s) => s.trim()).filter(Boolean)
  }

  if (ingredientStrings.length === 0) {
    throw new Error('Could not find any ingredients on that page. Try a different URL.')
  }
  siteNutritionRaw = siteNutritionRaw ?? extractVisibleNutrition(html)
  siteNutrition = scaleSiteNutrition(siteNutritionRaw ?? undefined, servings)

  // Edamam owns the parse + macro math. One call returns grams + macros per line.
  const edamam = await analyzeIngredientsWithEdamam(ingredientStrings, title || 'Imported recipe')

  const excludedIndexes = inferredDiscardedBrineIndexes(
    edamam.ingredients.map((line) => ({ name: line.food || line.text, grams: line.grams })),
    instructions,
  )
  const ingredients: ImportedIngredient[] = edamam.ingredients.map((line, index) => ({
    raw: line.text,
    food: line.food,
    grams: line.grams,
    calories: excludedIndexes.has(index) ? 0 : line.calories,
    protein: excludedIndexes.has(index) ? 0 : line.protein,
    carbs: excludedIndexes.has(index) ? 0 : line.carbs,
    fats: excludedIndexes.has(index) ? 0 : line.fats,
    fiber: excludedIndexes.has(index) ? 0 : line.fiber,
    unparsed: line.unparsed,
    line: setIngredientNutritionExcluded(formatLine(line), excludedIndexes.has(index)),
  }))
  const included = ingredients.filter((_, index) => !excludedIndexes.has(index))
  const edamamTotals = {
    calories: Math.round(included.reduce((sum, line) => sum + line.calories, 0)),
    protein: Math.round(included.reduce((sum, line) => sum + line.protein, 0) * 10) / 10,
    carbs: Math.round(included.reduce((sum, line) => sum + line.carbs, 0) * 10) / 10,
    fats: Math.round(included.reduce((sum, line) => sum + line.fats, 0) * 10) / 10,
    fiber: Math.round(included.reduce((sum, line) => sum + line.fiber, 0) * 10) / 10,
    grams: Math.round(included.reduce((sum, line) => sum + line.grams, 0) * 10) / 10,
  }
  const originalTotals = completeTotals(siteNutrition, edamamTotals.grams)

  return {
    title: title || 'Imported recipe',
    servings,
    prepTime,
    cookTime,
    ingredients,
    instructions,
    sourceUrl: url,
    notes: `Imported from ${url}. Review every ingredient before publishing.`,
    totals: edamamTotals,
    originalTotals,
    calculatedTotals: edamamTotals,
    nutritionSource: 'calculated',
  }
}
