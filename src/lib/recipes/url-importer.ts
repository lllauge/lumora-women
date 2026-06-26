import { searchFoodsForPicker } from '@/lib/usda/food-data'

export type ImportedIngredient = {
  raw: string
  food: string
  grams: number
  state: 'raw' | 'cooked' | null
  fdcId: number | null
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

type ParsedIngredientLine = {
  food: string
  grams: number
  state: 'raw' | 'cooked' | null
  fdcQuery: string
}

const PARSE_INSTRUCTIONS = `You convert recipe ingredient strings into structured data for a macro calculator.

Rules:
- Return ONLY a JSON array of objects, no prose. One object per input string in the SAME order.
- For each line, return: { "food": string, "grams": number, "state": "raw" | "cooked" | null, "fdcQuery": string }
- "food" is the cleaned, descriptive ingredient name (e.g. "black beans, canned, drained", "chicken breast", "kiwi").
- "grams" is the TOTAL grams the recipe calls for, computed from the quantity + unit using standard food weights. Use drained weights for canned items unless the line says "with liquid".
- "state" reflects whether the gram weight is "raw" / "cooked" / null. For ambiguous items default to null.
- "fdcQuery" is a SPECIFIC USDA search term: include cut, preparation, and state. Examples: "chicken breast boneless skinless raw" NOT "chicken"; "ground beef 93% lean raw" NOT "beef"; "brown rice long grain cooked" NOT "rice"; "black beans canned drained" NOT "beans". The query must disambiguate from related foods (e.g. ground vs whole cuts, raw vs cooked, canned vs dry). Skip brand names. Avoid filler words ("of", "the").
- If the source line lists alternates ("chicken tenders or chicken breast"), pick the FIRST option mentioned.
- If the source line is a whole-muscle cut (breast, thigh, tender, loin, fillet), NEVER return "ground" in fdcQuery.
- Skip pure water in unspecified amounts. For "to taste" / "for garnish" / "for serving", return grams: 1 and state: null.
- Standard reference weights: 1 large egg 50g, 1 large egg white 33g, 1 medium banana 118g, 1 medium apple 182g, 1 cup uncooked rice 185g (cooked 158g/cup), 1 tbsp olive oil 14g, 1 tsp salt 6g, 1 garlic clove 3g, 1 medium onion 110g, 1 medium tomato 123g, 1 medium kiwi 76g, 1 cup chopped greens 30g, 15-oz can drained beans 240g, 15-oz can drained corn 240g, 14.5-oz can diced tomatoes 411g, 5-oz tuna can drained 142g.
- Be precise. The numbers go straight into a client meal plan.`

async function parseIngredientsWithOpenAI(
  ingredientStrings: string[],
  openAiKey: string,
): Promise<ParsedIngredientLine[]> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
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
        { role: 'system', content: PARSE_INSTRUCTIONS },
        {
          role: 'user',
          content: `Parse these ingredient lines and return JSON in the form { "ingredients": [...] }:\n${ingredientStrings.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OpenAI ingredient parse failed: ${response.status} ${text.slice(0, 200)}`)
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content ?? '{}'
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('OpenAI returned non-JSON content for ingredient parse.')
  }
  const ingredients = (parsed as { ingredients?: ParsedIngredientLine[] }).ingredients
  if (!Array.isArray(ingredients)) {
    throw new Error('OpenAI response missing ingredients array.')
  }
  return ingredients
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
 * For each parsed ingredient, look up the best USDA match and build the
 * "[fdc:NNN] 240g black beans, canned" line format the editor expects so
 * macros calculate at save time.
 */
async function attachUsdaMatches(
  parsed: ParsedIngredientLine[],
  rawLines: string[],
  apiKey: string,
): Promise<ImportedIngredient[]> {
  return Promise.all(parsed.map(async (line, index) => {
    let fdcId: number | null = null
    let foodLabel = line.food
    try {
      const results = await searchFoodsForPicker(line.fdcQuery || line.food, apiKey)
      if (results.length > 0) {
        fdcId = results[0].fdcId
        foodLabel = results[0].description
      }
    } catch {
      // Soft-fail; the editor will let the admin pick a match manually.
    }
    const grams = Math.max(0, Math.round(line.grams * 10) / 10)
    const prefix = fdcId !== null ? `[fdc:${fdcId}] ` : ''
    return {
      raw: rawLines[index] ?? line.food,
      food: foodLabel,
      grams,
      state: line.state,
      fdcId,
      line: `${prefix}${grams}g ${foodLabel}`,
    }
  }))
}

export async function importRecipeFromUrl(
  url: string,
  openAiKey: string,
  usdaApiKey: string,
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

  const parsed = await parseIngredientsWithOpenAI(ingredientStrings, openAiKey)
  if (parsed.length !== ingredientStrings.length) {
    // Pad or trim so indices line up.
    while (parsed.length < ingredientStrings.length) {
      parsed.push({ food: ingredientStrings[parsed.length], grams: 0, state: null, fdcQuery: '' })
    }
    parsed.length = ingredientStrings.length
  }
  const ingredients = await attachUsdaMatches(parsed, ingredientStrings, usdaApiKey)

  return {
    title: title || 'Imported recipe',
    servings,
    prepTime,
    cookTime,
    ingredients,
    instructions,
    sourceUrl: url,
    notes: `Imported from ${url}. Review every ingredient before publishing.`,
  }
}
