import { parseIngredientLine as pasteParseIngredientLine } from '../recipes/paste-parser'
import { matchCommonFood } from './common-foods'

type FoodSearchResult = {
  fdcId: number
  description: string
  dataType?: string
  brandOwner?: string
  brandName?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodMeasures?: Array<{
    disseminationText?: string
    gramWeight?: number
    rank?: number
  }>
  foodNutrients?: Array<{
    nutrientId?: number
    nutrientName?: string
    value?: number
    unitName?: string
  }>
}

type FoodSearchResponse = {
  foods?: FoodSearchResult[]
}

type ParsedIngredient = {
  raw: string
  query: string
  grams: number | null
  warning?: string
}

type NutritionTotals = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type UsdaIngredientResult = {
  input: string
  matchedFood: string
  dataType: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fats: number
  warning?: string
}

export type UsdaClientServingIngredient = {
  input: string
  label: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fats: number
}

export type UsdaRecipeNutrition = {
  source: 'USDA FoodData Central'
  clientServingMultiplier: number
  clientServingGrams: number
  clientServingMeasure: string
  clientServingBreakdown: string
  totalRecipe: NutritionTotals
  clientServing: NutritionTotals
  clientServingIngredients: UsdaClientServingIngredient[]
  ingredients: UsdaIngredientResult[]
  warnings: string[]
}

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
}

const VOLUME_WARNINGS = new Set(['cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons'])

function round(value: number, places = 1) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function normalizeAmount(value: string) {
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])

  const fraction = value.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])

  return Number(value)
}

function parseIngredientLine(raw: string): ParsedIngredient & { fdcId?: number } {
  const line = raw.trim()
  const fdcMatch = line.match(/^\[fdc:(\d+)\]\s*/)
  const fdcId = fdcMatch ? parseInt(fdcMatch[1]) : undefined
  const lineWithoutFdc = fdcId ? line.slice(fdcMatch![0].length) : line
  const parsed = parseIngredientLineInner(lineWithoutFdc, raw)
  return fdcId ? { ...parsed, fdcId } : parsed
}

function parseIngredientLineInner(line: string, raw: string): ParsedIngredient {
  const match = line.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*([a-zA-Z]+)\b\s*(.+)$/)

  if (!match) {
    return {
      raw,
      query: line,
      grams: null,
      warning: 'Could not read an amount and unit. Use grams for best accuracy.',
    }
  }

  const amount = normalizeAmount(match[1])
  const unit = match[2].toLowerCase()
  const query = match[3].trim()
  const gramMultiplier = UNIT_TO_GRAMS[unit]

  if (gramMultiplier) {
    return { raw, query, grams: amount * gramMultiplier }
  }

  if (VOLUME_WARNINGS.has(unit)) {
    return {
      raw,
      query,
      grams: null,
      warning: `USDA calculation skipped "${unit}" because volume-to-grams varies by food. Use grams or ounces for this ingredient.`,
    }
  }

  return {
    raw,
    query,
    grams: null,
    warning: `Unknown unit "${unit}". Use grams, ounces, pounds, kilograms, or milliliters.`,
  }
}

function ingredientLabelFromInput(input: string) {
  return input
    .trim()
    .replace(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*([a-zA-Z]+)\b\s*/i, '')
    .trim()
}

function nutrientValue(food: FoodSearchResult, nutrientIds: number[], nutrientNames: string[], excludeNames: string[] = []) {
  const nutrients = food.foodNutrients ?? []
  const byId = nutrients.find((nutrient) => nutrient.nutrientId && nutrientIds.includes(nutrient.nutrientId))
  if (typeof byId?.value === 'number') return byId.value

  const byName = nutrients.find((nutrient) => {
    const name = nutrient.nutrientName?.toLowerCase() ?? ''
    if (excludeNames.some((ex) => name.includes(ex))) return false
    return nutrientNames.some((expected) => name.includes(expected))
  })

  return typeof byName?.value === 'number' ? byName.value : 0
}

function macrosPer100g(food: FoodSearchResult) {
  return {
    // IDs 1008, 2047, 2048 are all kcal variants. Exclude kJ from name fallback — kJ values are ~4x higher and would massively inflate calorie counts.
    calories: nutrientValue(food, [1008, 2047, 2048], ['energy'], ['kj', 'kilojoule']),
    protein: nutrientValue(food, [1003], ['protein']),
    carbs: nutrientValue(food, [1005], ['carbohydrate']),
    fats: nutrientValue(food, [1004], ['total lipid', 'fat']),
  }
}

async function searchFood(query: string, apiKey: string) {
  const url = new URL(USDA_SEARCH_URL)
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      pageSize: 10,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`USDA FoodData Central error: ${message.slice(0, 300)}`)
  }

  const data = await response.json() as FoodSearchResponse
  const foods = data.foods ?? []
  if (foods.length === 0) return null

  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length > 2 && !['and', 'the', 'with'].includes(token))

  const cookWords = ['cooked', 'baked', 'grilled', 'roasted', 'boiled', 'steamed', 'broiled', 'sauteed']
  const wantsCooked = cookWords.some((w) => queryTokens.includes(w))
  const wantsRaw = queryTokens.includes('raw')

  return foods
    .map((food) => {
      const description = food.description.toLowerCase()
      const tokenScore = queryTokens.reduce((score, token) => score + (description.includes(token) ? 4 : 0), 0)

      const isCookedInDescription = cookWords.some((w) => description.includes(w))
      const cookedScore = wantsCooked && isCookedInDescription ? 10 : 0
      // Penalize when user wants cooked but the food is not described as cooked/prepared
      const notCookedPenalty = wantsCooked && !isCookedInDescription && !description.includes('prepared') ? -12 : 0

      const rawScore = wantsRaw && description.includes('raw') ? 10 : 0
      // Penalize clearly uncooked/concentrated forms
      const rawPenalty = wantsCooked && /\b(raw|uncooked|dehydrated)\b/.test(description) ? -20 : 0
      const dryPenalty = wantsCooked && /\bdry\b/.test(description) ? -20 : 0
      // Penalize processed/concentrated forms that are never what someone means by "cooked chicken" or "cooked rice"
      const processedPenalty = /\b(flour|powder|flakes?|mix|concentrate|instant|freeze.dried)\b/.test(description) ? -20 : 0

      const dataTypeScore = food.dataType === 'Foundation' ? 3 : food.dataType === 'SR Legacy' ? 2 : 1
      return { food, score: tokenScore + cookedScore + notCookedPenalty + rawScore + rawPenalty + dryPenalty + processedPenalty + dataTypeScore }
    })
    .sort((a, b) => b.score - a.score)[0]?.food ?? foods[0]
}

export type UsdaFoodMeasure = {
  label: string
  grams: number
}

export type UsdaFoodOption = {
  fdcId: number
  description: string
  dataType: string
  brand: string
  calories: number
  protein: number
  carbs: number
  fats: number
  measures: UsdaFoodMeasure[]
}

// Any USDA description that describes a pourable food. Used to decide whether
// fl oz belongs in the unit dropdown even when USDA didn't return a volume measure.
const LIQUID_PATTERN = /\b(milk|juice|broth|stock|water|beverage|coffee|tea|kombucha|kefir|nectar|smoothie|shake|wine|beer|liquor|spirit|oil|vinegar|syrup|honey|molasses|cream|creamer|half.?and.?half|sauce|dressing|soda|cola|soymilk|beverages?)\b/i

// Grams per fl oz by liquid family, used as a fallback when USDA gave us no
// cup/Tbsp to derive from. Numbers come from USDA density tables.
function gramsPerFlOz(description: string): number {
  const desc = description.toLowerCase()
  if (/\boil\b/.test(desc)) return 27.6
  if (/\b(honey|molasses|maple syrup|corn syrup|syrup)\b/.test(desc)) return 42
  if (/\b(juice|nectar|soda|cola|energy drink|sports drink|kombucha|lemonade)\b/.test(desc)) return 30.9
  if (/\bheavy cream\b/.test(desc)) return 29.3
  if (/\b(half.?and.?half|cream|creamer)\b/.test(desc)) return 30.1
  if (/\b(milk|kefir|smoothie|shake|soymilk)\b/.test(desc)) return 30.3
  // Water, broth, stock, coffee, tea, wine, beer, vinegar
  return 29.57
}

// USDA often gives one volume measure (e.g. "1 Tbsp") but not its sibling units.
// Fill in tsp/Tbsp/cup from whichever volume measure we do have, so a recipe
// written in teaspoons doesn't force the user to convert by hand.
function augmentVolumeMeasures(measures: UsdaFoodMeasure[], description = ''): UsdaFoodMeasure[] {
  const has = (re: RegExp) => measures.some((m) => re.test(m.label))
  const find = (re: RegExp) => measures.find((m) => re.test(m.label))

  const tbsp = find(/^1\s*(tbsp|tablespoon)\b/i)
  const tsp = find(/^1\s*(tsp|teaspoon)\b/i)
  const cup = find(/^1\s*cup\b/i)
  const flOz = find(/^1\s*fl\.?\s*oz\b/i)

  const derived: UsdaFoodMeasure[] = []
  // 1 Tbsp = 3 tsp, 1 cup = 16 Tbsp = 48 tsp
  if (tbsp && !tsp) derived.push({ label: '1 tsp', grams: Math.round((tbsp.grams / 3) * 10) / 10 })
  if (tsp && !tbsp) derived.push({ label: '1 Tbsp', grams: Math.round(tsp.grams * 3 * 10) / 10 })
  if (tbsp && !cup) derived.push({ label: '1 cup', grams: Math.round(tbsp.grams * 16 * 10) / 10 })
  if (cup && !tbsp) derived.push({ label: '1 Tbsp', grams: Math.round((cup.grams / 16) * 10) / 10 })
  if (cup && !has(/^1\s*(tsp|teaspoon)\b/i)) derived.push({ label: '1 tsp', grams: Math.round((cup.grams / 48) * 10) / 10 })

  // Liquids should also expose fl oz. Prefer USDA-derived (cup ÷ 8 or Tbsp × 2)
  // when a volume measure exists; fall back to per-liquid density otherwise.
  const isLiquid = LIQUID_PATTERN.test(description.toLowerCase())
  if (!flOz && (isLiquid || cup || tbsp)) {
    const flOzGrams = cup ? cup.grams / 8
      : tbsp ? tbsp.grams * 2
      : isLiquid ? gramsPerFlOz(description)
      : null
    if (flOzGrams !== null) {
      derived.push({ label: '1 fl oz', grams: Math.round(flOzGrams * 10) / 10 })
    }
  }

  return [...measures, ...derived]
}

// Household measures ("1 large", "1 cup, sliced") so count-based foods like
// eggs and bananas can be entered as "2 each" instead of weighed.
function foodMeasureOptions(food: FoodSearchResult): UsdaFoodMeasure[] {
  const measures = (food.foodMeasures ?? [])
    .filter((m) => {
      const text = (m.disseminationText ?? '').trim()
      return typeof m.gramWeight === 'number' && m.gramWeight > 0
        && text && !/quantity not specified/i.test(text)
    })
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 6)
    .map((m) => ({
      label: (m.disseminationText ?? '').trim(),
      grams: Math.round((m.gramWeight as number) * 10) / 10,
    }))

  // Branded foods carry a label serving instead of foodMeasures.
  const servingUnit = String(food.servingSizeUnit ?? '').toLowerCase()
  if (measures.length === 0 && typeof food.servingSize === 'number' && food.servingSize > 0
    && (servingUnit === 'g' || servingUnit === 'ml' || servingUnit === 'grm' || servingUnit === 'mlt')) {
    measures.push({
      label: (food.householdServingFullText ?? '').trim() || '1 serving',
      grams: Math.round(food.servingSize * 10) / 10,
    })
  }

  return augmentVolumeMeasures(measures, food.description)
}

// Common food vocabulary — tokens in this set are NOT treated as brand names,
// so they don't trigger a brand-only sub-search. Anything else is treated as a
// likely brand and gets a parallel Branded-only query so brand matches surface
// even when USDA's main relevance ranking buries them under generic foods.
const COMMON_FOOD_WORDS = new Set([
  'protein', 'powder', 'powdered', 'flour', 'flakes', 'flake', 'mix', 'concentrate',
  'instant', 'whey', 'pea', 'soy', 'casein', 'plant', 'based', 'vegan',
  'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'egg', 'eggs',
  'milk', 'butter', 'cheese', 'yogurt', 'cream',
  'rice', 'pasta', 'bread', 'oats', 'oat', 'quinoa', 'barley', 'wheat', 'corn',
  'apple', 'banana', 'orange', 'berry', 'fruit', 'vegetable',
  'cooked', 'raw', 'baked', 'grilled', 'roasted', 'boiled', 'steamed', 'broiled',
  'large', 'medium', 'small', 'whole', 'half', 'piece', 'slice',
  'low', 'high', 'fat', 'free', 'reduced', 'lean', 'extra', 'lite', 'light',
  'organic', 'natural', 'fresh', 'frozen', 'dried', 'canned',
  'chocolate', 'vanilla', 'strawberry', 'plain', 'flavored',
  'shake', 'drink', 'beverage', 'bar', 'snack',
  'and', 'the', 'with', 'for', 'all', 'any',
])

export async function searchFoodsForPicker(query: string, apiKey: string): Promise<UsdaFoodOption[]> {
  const url = new URL(USDA_SEARCH_URL)
  url.searchParams.set('api_key', apiKey)

  const queryTokensRaw = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 2 && t !== 'and' && t !== 'the' && t !== 'with')

  // Likely brand-name tokens get a parallel Branded-only search — USDA's main
  // relevance ranker buries small brands under thousands of generic matches.
  const brandLikeTokens = queryTokensRaw.filter((t) => t.length >= 4 && !COMMON_FOOD_WORDS.has(t))

  const fetchSearch = (body: object) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.ok ? r.json() as Promise<FoodSearchResponse> : null).catch(() => null)

  // Check our curated common-foods list first. If the query matches a staple
  // (chicken breast, brown rice, etc.), fire a precise USDA search for the
  // canonical entry — the result gets pinned at the top with a clean label,
  // so the admin sees what they actually wanted instead of derivatives.
  const commonFood = matchCommonFood(query)

  const [mainData, brandedData, commonData] = await Promise.all([
    fetchSearch({
      query,
      // USDA's relevance ranker buries core foods (e.g. "Rice, brown, long
      // grain, raw") under derivatives (rice cakes, rice flour, baby food).
      // Fetch deep so the scorer below has the real food to promote.
      pageSize: 100,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
    }),
    brandLikeTokens.length > 0
      ? fetchSearch({
          query: brandLikeTokens.map((t) => `"${t}"`).join(' '),
          pageSize: 25,
          dataType: ['Branded'],
        })
      : Promise.resolve(null),
    commonFood
      ? fetchSearch({
          query: commonFood.usdaQuery,
          pageSize: 5,
          dataType: ['Foundation', 'SR Legacy'],
        })
      : Promise.resolve(null),
  ])

  if (!mainData && !brandedData) return []

  // Merge results, de-duplicating by fdcId.
  const seen = new Set<number>()
  const foods: FoodSearchResult[] = []
  for (const f of [...(mainData?.foods ?? []), ...(brandedData?.foods ?? [])]) {
    if (seen.has(f.fdcId)) continue
    seen.add(f.fdcId)
    foods.push(f)
  }

  const queryTokens = queryTokensRaw

  const cookWords = ['cooked', 'baked', 'grilled', 'roasted', 'boiled', 'steamed', 'broiled', 'sauteed']
  const wantsCooked = cookWords.some((w) => queryTokens.includes(w))
  // When the query explicitly names a processed form (e.g. "protein powder",
  // "almond flour", "oat flakes"), skip the processed penalty — the user
  // wants that product. Branded items (Truvani, Quest, etc.) would otherwise
  // be filtered out.
  const processedWords = ['flour', 'powder', 'powdered', 'flakes', 'flake', 'mix', 'concentrate', 'instant', 'protein']
  const wantsProcessed = processedWords.some((w) => queryTokens.includes(w))
  // Same logic for ground meats: only return "ground beef/chicken/turkey"
  // results when the query explicitly asks for ground. Whole-muscle cut
  // queries ("chicken breast", "pork loin") should never match ground.
  const wantsGround = queryTokens.includes('ground') || queryTokens.includes('minced')
  // USDA descriptions follow a "Category, descriptor, descriptor" pattern.
  // Descriptions that start with one of these tangential categories are
  // rarely what someone cooking a meal wants — they're processed snack
  // foods, baby food, restaurant prepared dishes, etc.
  const TANGENTIAL_CATEGORY = /^(snacks|babyfood|fast foods|fast food|restaurant|cocktail|cereals ready[-\s]to[-\s]eat|infant formula|leavening agents|formulated bar)/i
  // Whether the query itself sounds like a tangential category — if she
  // searched "snacks", she actually wants snacks.
  const wantsTangential = TANGENTIAL_CATEGORY.test(query.toLowerCase())

  const scored = foods
    .map((food) => {
      const description = food.description.toLowerCase()
      const tokenScore = queryTokens.reduce((s, t) => s + (description.includes(t) ? 4 : 0), 0)
      const isCookedInDescription = cookWords.some((w) => description.includes(w))
      const cookedScore = wantsCooked && isCookedInDescription ? 10 : 0
      const notCookedPenalty = wantsCooked && !isCookedInDescription && !description.includes('prepared') ? -12 : 0
      const rawPenalty = wantsCooked && /\b(raw|uncooked|dehydrated)\b/.test(description) ? -20 : 0
      const dryPenalty = wantsCooked && /\bdry\b/.test(description) ? -20 : 0
      const processedPenalty = !wantsProcessed && /\b(flour|powder|flakes?|mix|concentrate|instant|freeze.dried)\b/.test(description) ? -20 : 0
      const groundPenalty = !wantsGround && /\b(ground|minced)\b/.test(description) ? -20 : 0
      // Lab-analyzed generics outrank label-reported branded products in ties.
      const dataTypeScore = food.dataType === 'Foundation' ? 3 : food.dataType === 'SR Legacy' ? 2 : food.dataType === 'Branded' ? 0 : 1
      const brandTokens = `${food.brandName ?? ''} ${food.brandOwner ?? ''}`.toLowerCase()
      // Strong brand boost so a typed brand name (e.g. "truvani") promotes the
      // branded match above generic SR Legacy / Foundation rows.
      const brandScore = food.dataType === 'Branded'
        ? queryTokens.reduce((s, t) => s + (brandTokens.includes(t) ? 8 : 0), 0)
        : 0
      const tangentialPenalty = !wantsTangential && TANGENTIAL_CATEGORY.test(description) ? -15 : 0
      // USDA's descriptions follow "<noun>, <descriptor>..." pattern, where
      // the leading noun IS the food (e.g. "Rice, brown, long-grain, raw").
      // When that leading noun is one of the query tokens, it's almost
      // certainly the core food — promote it above derivatives.
      const corePrefixBonus = queryTokens.some((t) => description.startsWith(`${t},`)) ? 6 : 0
      const score = tokenScore + brandScore + cookedScore + notCookedPenalty + rawPenalty + dryPenalty + processedPenalty + groundPenalty + tangentialPenalty + corePrefixBonus + dataTypeScore
      const macros = macrosPer100g(food)
      return { food, score, macros }
    })
    .filter(({ score, macros }) => score > 0
      && (macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fats > 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  // Pin the curated common-food at the very top with its clean display name,
  // and remove any duplicate further down the list.
  const pinnedCommonFood = commonFood && commonData?.foods?.[0]
    ? { food: { ...commonData.foods[0], description: commonFood.displayName }, macros: macrosPer100g(commonData.foods[0]) }
    : null
  const ranked = pinnedCommonFood
    ? [pinnedCommonFood, ...scored.filter((s) => s.food.fdcId !== pinnedCommonFood.food.fdcId)]
    : scored

  // Branded search rows can carry mis-normalized nutrients; pull the label-corrected
  // per-100g values from the detail endpoint so the preview matches the saved math.
  return Promise.all(ranked.map(async ({ food, macros }) => {
    let corrected = macros
    if (food.dataType === 'Branded') {
      const detail = await fetchFoodById(food.fdcId, apiKey).catch(() => null)
      if (detail) corrected = macrosPer100g(detail)
    }
    return {
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType ?? '',
      brand: food.brandName || food.brandOwner || '',
      calories: Math.round(corrected.calories),
      protein: Math.round(corrected.protein * 10) / 10,
      carbs: Math.round(corrected.carbs * 10) / 10,
      fats: Math.round(corrected.fats * 10) / 10,
      measures: foodMeasureOptions(food),
    }
  }))
}

// Household measures live in the per-food detail response (foodPortions), not in
// search results — SR Legacy/Foundation foods come back from search with no measures.
export async function getFoodMeasuresById(fdcId: number, apiKey: string): Promise<UsdaFoodMeasure[]> {
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`)
  if (!response.ok) return []
  const data = await response.json() as Record<string, unknown>

  type DetailPortion = {
    amount?: number
    gramWeight?: number
    modifier?: string
    portionDescription?: string
    measureUnit?: { name?: string }
  }
  const portions = (data.foodPortions ?? []) as DetailPortion[]
  const measures: UsdaFoodMeasure[] = []
  for (const p of portions) {
    if (typeof p.gramWeight !== 'number' || p.gramWeight <= 0) continue
    const unitName = p.measureUnit?.name && !/undetermined/i.test(p.measureUnit.name) ? p.measureUnit.name : ''
    const described = (p.portionDescription ?? '').trim()
    const label = (described && !/quantity not specified/i.test(described) ? described : '')
      || [p.amount ?? '', unitName, (p.modifier ?? '').trim()].filter(Boolean).join(' ').trim()
    if (!label || /quantity not specified/i.test(label)) continue
    measures.push({ label, grams: Math.round(p.gramWeight * 10) / 10 })
  }

  if (measures.length === 0 && data.dataType === 'Branded') {
    const servingSize = Number(data.servingSize)
    const unit = String(data.servingSizeUnit ?? '').toLowerCase()
    if (Number.isFinite(servingSize) && servingSize > 0 && (unit === 'g' || unit === 'ml' || unit === 'grm' || unit === 'mlt')) {
      measures.push({
        label: String(data.householdServingFullText ?? '').trim() || '1 serving',
        grams: Math.round(servingSize * 10) / 10,
      })
    }
  }

  return augmentVolumeMeasures(measures.slice(0, 8), String(data.description ?? ''))
}

async function fetchFoodById(fdcId: number, apiKey: string): Promise<FoodSearchResult | null> {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return null
  const data = await response.json() as Record<string, unknown>

  // The detail endpoint returns nutrients as { nutrient: { id, name }, amount } — normalize to search format
  type DetailNutrient = { nutrient?: { id?: number; name?: string }; amount?: number; nutrientId?: number; nutrientName?: string; value?: number; unitName?: string }
  const rawNutrients = (data.foodNutrients ?? []) as DetailNutrient[]
  const foodNutrients = rawNutrients.map((n) => ({
    nutrientId: n.nutrient?.id ?? n.nutrientId,
    nutrientName: n.nutrient?.name ?? n.nutrientName,
    value: n.amount ?? n.value,
    unitName: n.unitName,
  }))

  // Some Branded records carry per-serving label values where per-100g data should be.
  // The manufacturer label (labelNutrients ÷ servingSize) is the ground truth, so for
  // Branded foods recompute per-100g from it and let those values win the ID lookup.
  if (data.dataType === 'Branded') {
    type LabelNutrients = Partial<Record<'calories' | 'protein' | 'carbohydrates' | 'fat', { value?: number }>>
    const label = (data.labelNutrients ?? {}) as LabelNutrients
    const servingSize = Number(data.servingSize)
    const servingUnit = String(data.servingSizeUnit ?? '').toLowerCase()
    if (Number.isFinite(servingSize) && servingSize > 0 && (servingUnit === 'g' || servingUnit === 'ml' || servingUnit === 'grm' || servingUnit === 'mlt')) {
      const per100 = (value: number | undefined) =>
        typeof value === 'number' ? (value * 100) / servingSize : undefined
      const overrides: Array<{ nutrientId: number; value: number | undefined }> = [
        { nutrientId: 1008, value: per100(label.calories?.value) },
        { nutrientId: 1003, value: per100(label.protein?.value) },
        { nutrientId: 1005, value: per100(label.carbohydrates?.value) },
        { nutrientId: 1004, value: per100(label.fat?.value) },
      ]
      for (const { nutrientId, value } of overrides) {
        if (value === undefined) continue
        foodNutrients.unshift({ nutrientId, nutrientName: undefined, value, unitName: undefined })
      }
    }
  }

  return {
    fdcId: data.fdcId as number,
    description: data.description as string,
    dataType: data.dataType as string | undefined,
    brandOwner: data.brandOwner as string | undefined,
    brandName: data.brandName as string | undefined,
    foodNutrients,
  }
}

function parseServingMultiplier(value: string | undefined) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return 1

  const fraction = normalized.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])

  const percent = normalized.match(/^(\d+(?:\.\d+)?)\s*%$/)
  if (percent) return Number(percent[1]) / 100

  const number = Number(normalized)
  return Number.isFinite(number) && number > 0 ? number : 1
}

function parseServingCount(value: string | undefined): number | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null
  const match = normalized.match(/(\d+(?:\.\d+)?)/)
  const count = match ? Number(match[1]) : null
  return count && count > 1 ? count : null
}

export function estimateServingMultiplier({
  manualMultiplier,
  familyServings,
}: {
  manualMultiplier?: string
  familyServings?: string
}) {
  const manual = String(manualMultiplier ?? '').trim()
  if (manual) return parseServingMultiplier(manual)

  const servings = parseServingCount(familyServings)
  if (servings) return 1 / servings

  return 1
}

function practicalServingMeasure({
  multiplier,
  clientServingGrams,
}: {
  multiplier: number
  clientServingGrams: number
}) {
  const recipeShare = multiplier >= 1 ? 'the full recipe' : `${Math.round(multiplier * 100)}% of the full recipe`
  return `Plate by the ingredient weights below. Total client serving is about ${clientServingGrams}g (${recipeShare}).`
}

function clientServingBreakdown(ingredients: UsdaClientServingIngredient[]) {
  return ingredients
    .map((ingredient) => `${ingredient.grams}g ${ingredient.label}`)
    .join(' + ')
}

function clientServingMacroBreakdown(ingredients: UsdaClientServingIngredient[]) {
  return ingredients
    .map((ingredient) => (
      `${ingredient.grams}g ${ingredient.label}: ${ingredient.calories} cal, ${ingredient.protein}g protein, ${ingredient.carbs}g carbs, ${ingredient.fats}g fats`
    ))
    .join(' | ')
}

export async function calculateRecipeNutritionFromUsda({
  ingredients,
  clientServingMultiplier,
  targetCalories,
  familyServings,
  apiKey,
}: {
  ingredients: string[]
  clientServingMultiplier?: string
  targetCalories?: number
  familyServings?: string
  apiKey: string
}): Promise<UsdaRecipeNutrition> {
  const warnings: string[] = []
  const results: UsdaIngredientResult[] = []

  for (const raw of ingredients) {
    const parsed = parseIngredientLine(raw)

    // USDA's parser only handles weight units (g/oz/lb/kg/ml). Fall through to
    // paste-parser for cans, cups, counts, and "1 large egg" style lines so
    // they still contribute to the day total instead of silently zeroing out.
    let grams = parsed.grams
    let searchQuery = parsed.query
    if (!grams && !parsed.fdcId) {
      const paste = pasteParseIngredientLine(raw)
      if (paste.grams > 0) {
        grams = paste.grams
        searchQuery = paste.name || parsed.query
      }
    }

    if (!grams) {
      if (parsed.warning) warnings.push(`${raw}: ${parsed.warning}`)
      continue
    }

    const food = parsed.fdcId
      ? await fetchFoodById(parsed.fdcId, apiKey)
      : await searchFood(searchQuery, apiKey)
    if (!food) {
      warnings.push(`${raw}: No USDA match found.`)
      continue
    }

    const per100g = macrosPer100g(food)
    const scale = grams / 100
    results.push({
      input: raw,
      matchedFood: food.description,
      dataType: food.dataType ?? 'USDA',
      grams: round(grams),
      calories: round(per100g.calories * scale),
      protein: round(per100g.protein * scale),
      carbs: round(per100g.carbs * scale),
      fats: round(per100g.fats * scale),
      warning: parsed.warning,
    })
  }

  const totalRecipe = results.reduce((total, ingredient) => ({
    calories: total.calories + ingredient.calories,
    protein: total.protein + ingredient.protein,
    carbs: total.carbs + ingredient.carbs,
    fats: total.fats + ingredient.fats,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
  const totalRecipeGrams = results.reduce((total, ingredient) => total + ingredient.grams, 0)

  const manualMult = String(clientServingMultiplier ?? '').trim()
  const servingCount = parseServingCount(familyServings)
  let multiplier: number
  if (manualMult) {
    multiplier = parseServingMultiplier(manualMult)
  } else if (targetCalories && totalRecipe.calories > 0) {
    multiplier = Math.min(1, targetCalories / totalRecipe.calories)
  } else if (servingCount) {
    multiplier = 1 / servingCount
  } else {
    multiplier = 1
  }
  const clientServingGrams = Math.round(totalRecipeGrams * multiplier)
  const clientServingIngredients = results.map((ingredient) => ({
    input: ingredient.input,
    label: ingredientLabelFromInput(ingredient.input) || ingredient.matchedFood.toLowerCase(),
    grams: Math.round(ingredient.grams * multiplier),
    calories: Math.round(ingredient.calories * multiplier),
    protein: round(ingredient.protein * multiplier),
    carbs: round(ingredient.carbs * multiplier),
    fats: round(ingredient.fats * multiplier),
  }))
  const breakdown = clientServingBreakdown(clientServingIngredients)
  const macroBreakdown = clientServingMacroBreakdown(clientServingIngredients)

  return {
    source: 'USDA FoodData Central',
    clientServingMultiplier: multiplier,
    clientServingGrams,
    clientServingMeasure: practicalServingMeasure({
      multiplier,
      clientServingGrams,
    }),
    clientServingBreakdown: [breakdown, macroBreakdown ? `Details: ${macroBreakdown}` : ''].filter(Boolean).join('\n'),
    totalRecipe: {
      calories: round(totalRecipe.calories),
      protein: round(totalRecipe.protein),
      carbs: round(totalRecipe.carbs),
      fats: round(totalRecipe.fats),
    },
    clientServing: {
      calories: Math.round(totalRecipe.calories * multiplier),
      protein: round(totalRecipe.protein * multiplier),
      carbs: round(totalRecipe.carbs * multiplier),
      fats: round(totalRecipe.fats * multiplier),
    },
    clientServingIngredients,
    ingredients: results,
    warnings,
  }
}
