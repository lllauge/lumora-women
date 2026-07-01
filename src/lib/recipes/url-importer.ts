import { analyzeIngredientsWithEdamam, type EdamamLineMacros } from '@/lib/edamam'
import {
  inferredDiscardedBrineIndexes,
  setIngredientNutritionExcluded,
} from '@/lib/nutrition-ingredient'

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
}

const FETCH_TIMEOUT_MS = 12_000
const FETCH_USER_AGENT = 'Mozilla/5.0 (compatible; LumoraRecipeImporter/1.0)'

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': FETCH_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!response.ok) throw new Error(`Site returned ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

type JsonLdRecipe = {
  name?: string
  recipeYield?: string | number | string[]
  recipeIngredient?: string[]
  ingredients?: string[]
  recipeInstructions?: unknown
  prepTime?: string
  cookTime?: string
  totalTime?: string
}

function extractJsonLdRecipe(html: string): JsonLdRecipe | null {
  // Recipe sites embed schema.org/Recipe as JSON-LD in <script type="application/ld+json">.
  // Some sites nest the Recipe under @graph or list multiple types — handle both.
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []
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
      const recipe = findRecipeNode(entry)
      if (recipe) return recipe
    }
  }
  return null
}

function findRecipeNode(node: unknown): JsonLdRecipe | null {
  if (!node || typeof node !== 'object') return null
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
  if (isRecipe) return obj as JsonLdRecipe
  const graph = obj['@graph']
  if (Array.isArray(graph)) {
    for (const child of graph) {
      const found = findRecipeNode(child)
      if (found) return found
    }
  }
  return null
}

function parseServings(value: JsonLdRecipe['recipeYield']): number {
  if (!value) return 4
  if (typeof value === 'number') return value
  const text = Array.isArray(value) ? value[0] : value
  const match = String(text).match(/\d+/)
  return match ? Number(match[0]) : 4
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

async function extractRecipeWithOpenAI(html: string, openAiKey: string): Promise<JsonLdRecipe> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  // Strip scripts and trim to keep prompt size sane.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16_000)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACT_INSTRUCTIONS },
        { role: 'user', content: cleaned },
      ],
    }),
  })

  if (!response.ok) throw new Error(`OpenAI recipe extract failed: ${response.status}`)
  const data = await response.json() as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content ?? '{}'
  return JSON.parse(content) as JsonLdRecipe
}

/**
 * Convert one Edamam line into the editor's [fdc:..] gram-prefixed format.
 * Edamam doesn't return FDC IDs, so we omit the prefix — the recipe save
 * path uses the inline calories/macros from the recipe totals, not per-line
 * USDA lookup, for Edamam-imported recipes.
 */
function formatLine(line: EdamamLineMacros): string {
  const grams = Math.max(0, Math.round(line.grams * 10) / 10)
  const food = line.food || line.text || 'ingredient'
  return `${grams}g ${food}`
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

  const jsonLd = extractJsonLdRecipe(html)
  if (jsonLd) {
    title = String(jsonLd.name ?? '').trim()
    servings = parseServings(jsonLd.recipeYield)
    prepTime = parseDuration(jsonLd.prepTime)
    cookTime = parseDuration(jsonLd.cookTime)
    ingredientStrings = (jsonLd.recipeIngredient ?? jsonLd.ingredients ?? []).map((s) => String(s).trim()).filter(Boolean)
    instructions = parseInstructions(jsonLd.recipeInstructions)
  }

  // Fall back to an LLM extraction when the page has no structured data.
  if (ingredientStrings.length === 0) {
    const llm = await extractRecipeWithOpenAI(html, openAiKey)
    title = title || String(llm.name ?? '').trim() || 'Imported recipe'
    if (!servings || servings <= 0) servings = parseServings(llm.recipeYield)
    if (!prepTime) prepTime = String(llm.prepTime ?? '').trim()
    if (!cookTime) cookTime = String(llm.cookTime ?? '').trim()
    ingredientStrings = (llm.recipeIngredient ?? llm.ingredients ?? []).map((s) => String(s).trim()).filter(Boolean)
    if (instructions.length === 0) instructions = parseInstructions(llm.recipeInstructions)
  }

  if (ingredientStrings.length === 0) {
    throw new Error('Could not find any ingredients on that page. Try a different URL.')
  }

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

  return {
    title: title || 'Imported recipe',
    servings,
    prepTime,
    cookTime,
    ingredients,
    instructions,
    sourceUrl: url,
    notes: `Imported from ${url}. Review every ingredient before publishing.`,
    totals: {
      calories: Math.round(included.reduce((sum, line) => sum + line.calories, 0)),
      protein: Math.round(included.reduce((sum, line) => sum + line.protein, 0) * 10) / 10,
      carbs: Math.round(included.reduce((sum, line) => sum + line.carbs, 0) * 10) / 10,
      fats: Math.round(included.reduce((sum, line) => sum + line.fats, 0) * 10) / 10,
      fiber: Math.round(included.reduce((sum, line) => sum + line.fiber, 0) * 10) / 10,
      grams: Math.round(included.reduce((sum, line) => sum + line.grams, 0) * 10) / 10,
    },
  }
}
