const EXCLUDED_INGREDIENT = /\b(for (?:the )?(?:brine|marinade),?\s*(?:then )?discard(?:ed)?|brining liquid,?\s*discard(?:ed)?|not consumed|discard(?:ed)? after (?:brining|marinating))\b/i
const PLAIN_WATER = /^(?:plain\s+)?(?:tap\s+|bottled\s+|filtered\s+)?water(?:\s*\([^)]*\))?$/i
const PLAIN_SALT = /^(?:(?:fine|coarse|flaky|iodized)\s+)?(?:kosher|sea|table|pink|himalayan)?\s*salt(?:\s*\([^)]*\))?$/i

export function isExcludedNutritionIngredient(value: string) {
  return EXCLUDED_INGREDIENT.test(value)
}

export function isCanonicalZeroNutritionIngredient(value: string) {
  const normalized = value
    .replace(/^\[fdc:\d+\]\s*/, '')
    .replace(/^\d+(?:\.\d+)?\s*g\s+/i, '')
    .trim()
  return PLAIN_WATER.test(normalized) || PLAIN_SALT.test(normalized)
}

export function setIngredientNutritionExcluded(value: string, excluded: boolean) {
  const withoutMarker = value.replace(/\s*\(not consumed\)\s*$/i, '').trim()
  return excluded ? `${withoutMarker} (not consumed)` : withoutMarker
}

/**
 * Brine water and the large salt charge are drained before cooking. Detect
 * that specific, explicit instruction pattern so URL imports do not count the
 * discarded liquid as recipe yield. Other marinades remain manual because
 * their retained amount cannot be inferred safely.
 */
export function inferredDiscardedBrineIndexes(
  ingredients: Array<{ name: string; grams: number }>,
  instructions: string[],
) {
  const method = instructions.join(' ').toLowerCase()
  if (!/\bbrin(?:e|ing|ed)\b/.test(method) || !/\b(drain|discard|rinse)\b/.test(method)) {
    return new Set<number>()
  }

  const excluded = new Set<number>()
  const saltCandidates: Array<{ index: number; grams: number }> = []
  ingredients.forEach((ingredient, index) => {
    const name = ingredient.name.toLowerCase()
    if (/\bwater\b/.test(name)) excluded.add(index)
    if (/\b(?:kosher|sea|table|pink|himalayan)?\s*salt\b/.test(name)) {
      saltCandidates.push({ index, grams: ingredient.grams })
    }
  })
  saltCandidates.sort((a, b) => b.grams - a.grams)
  if (saltCandidates[0]) excluded.add(saltCandidates[0].index)
  return excluded
}
