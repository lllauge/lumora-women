type FoodSearchResult = {
  fdcId: number
  description: string
  dataType?: string
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

function parseIngredientLine(raw: string): ParsedIngredient {
  const line = raw.trim()
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

function nutrientValue(food: FoodSearchResult, nutrientIds: number[], nutrientNames: string[]) {
  const nutrients = food.foodNutrients ?? []
  const byId = nutrients.find((nutrient) => nutrient.nutrientId && nutrientIds.includes(nutrient.nutrientId))
  if (typeof byId?.value === 'number') return byId.value

  const byName = nutrients.find((nutrient) => {
    const name = nutrient.nutrientName?.toLowerCase() ?? ''
    return nutrientNames.some((expected) => name.includes(expected))
  })

  return typeof byName?.value === 'number' ? byName.value : 0
}

function macrosPer100g(food: FoodSearchResult) {
  return {
    calories: nutrientValue(food, [1008], ['energy']),
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
      pageSize: 5,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],
      sortBy: 'dataType.keyword',
      sortOrder: 'asc',
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
  const wantsCooked = queryTokens.includes('cooked')
  const wantsRaw = queryTokens.includes('raw')

  return foods
    .map((food) => {
      const description = food.description.toLowerCase()
      const tokenScore = queryTokens.reduce((score, token) => score + (description.includes(token) ? 4 : 0), 0)
      const cookedScore = wantsCooked && description.includes('cooked') ? 10 : 0
      const rawScore = wantsRaw && description.includes('raw') ? 10 : 0
      const rawPenalty = wantsCooked && /\b(raw|uncooked|dry|unenriched)\b/.test(description) ? -20 : 0
      const dataTypeScore = food.dataType === 'Foundation' ? 3 : food.dataType === 'SR Legacy' ? 2 : 1
      return { food, score: tokenScore + cookedScore + rawScore + rawPenalty + dataTypeScore }
    })
    .sort((a, b) => b.score - a.score)[0]?.food ?? foods[0]
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
    if (parsed.warning) warnings.push(`${raw}: ${parsed.warning}`)
    if (!parsed.grams) continue

    const food = await searchFood(parsed.query, apiKey)
    if (!food) {
      warnings.push(`${raw}: No USDA match found.`)
      continue
    }

    const per100g = macrosPer100g(food)
    const scale = parsed.grams / 100
    results.push({
      input: raw,
      matchedFood: food.description,
      dataType: food.dataType ?? 'USDA',
      grams: round(parsed.grams),
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
  } else if (servingCount) {
    multiplier = 1 / servingCount
  } else if (targetCalories && totalRecipe.calories > 0) {
    multiplier = Math.min(1, targetCalories / totalRecipe.calories)
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
