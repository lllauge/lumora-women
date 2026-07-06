// Cooked → raw weight multipliers for shopping. USDA gram values are tied to
// the cooked food entry, but the grocery list needs raw weights (what you buy
// at the store). Numbers are practical kitchen averages, not lab-precise.
const COOKED_WORDS = /\b(cooked|baked|roasted|grilled|poached|boiled|steamed|toasted|saut[eé]ed|scrambled|fried)\b/i
const RAW_WORDS = /\b(raw|uncooked|dry|dried)\b/i

const COOKED_TO_RAW: { match: RegExp; factor: number }[] = [
  { match: /\brice\b/i, factor: 1 / 3 },
  { match: /\b(pasta|spaghetti|penne|noodle|macaroni)\b/i, factor: 0.5 },
  { match: /\b(quinoa|farro|barley|bulgur|couscous)\b/i, factor: 0.4 },
  { match: /\b(oat|oatmeal|porridge)\b/i, factor: 0.4 },
  { match: /\b(lentil|bean|chickpea|garbanzo|black bean|kidney bean|pinto)\b/i, factor: 0.4 },
  { match: /\b(ground)\b.*\b(beef|turkey|chicken|pork|lamb)\b/i, factor: 1.3 },
  { match: /\b(chicken|turkey|duck|poultry)\b/i, factor: 1.33 },
  { match: /\b(beef|steak|pork|lamb|veal|bison)\b/i, factor: 1.35 },
  { match: /\b(salmon|tuna|cod|halibut|tilapia|shrimp|fish)\b/i, factor: 1.25 },
  { match: /\b(potato|sweet potato|yam)\b/i, factor: 0.9 },
]

/**
 * Raw → cooked weight estimate for the client's plated portion (inverse of the
 * shopping table). Labels already carrying a cooked word keep their grams;
 * foods without a yield rule (oils, seasonings) pass through unchanged, which
 * keeps the estimate honest for dishes that are mostly protein or starch.
 */
export function rawGramsToCookedEstimate(label: string, grams: number): number {
  if (COOKED_WORDS.test(label) && !RAW_WORDS.test(label)) return grams
  for (const rule of COOKED_TO_RAW) {
    if (rule.match.test(label)) return grams / rule.factor
  }
  return grams
}

export function cookedGramsToRaw(label: string, grams: number): { grams: number; label: string } {
  if (!COOKED_WORDS.test(label) || RAW_WORDS.test(label)) return { grams, label }
  for (const rule of COOKED_TO_RAW) {
    if (rule.match.test(label)) {
      const rawLabel = label
        .replace(/,?\s*\b(cooked|baked|roasted|grilled|poached|boiled|steamed|toasted|saut[eé]ed|scrambled|fried)\b/gi, '')
        .replace(/\s+,/g, ',')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .replace(/,$/, '')
      return { grams: grams * rule.factor, label: `${rawLabel}, raw` }
    }
  }
  return { grams, label }
}
