// Cooked → raw weight multipliers for shopping. USDA gram values are tied to
// the cooked food entry, but the grocery list needs raw weights (what you buy
// at the store). Numbers are practical kitchen averages, not lab-precise.
// The cooking vocabulary below was audited against every SR Legacy and
// Foundation description in FoodData Central — USDA writes cook states as
// "cooked, braised", "cooked, dry heat", "microwaved", "unprepared", etc.
const COOKED_WORD =
  'cooked|baked|roasted|broiled|grilled|braised|stewed|simmered|poached|boiled|' +
  'steamed|blanched|microwaved|toasted|saut[eé]ed|pan-fried|stir-fried|' +
  'pan-broiled|fried|scrambled|hard-?boiled|soft-?boiled|rotisserie|heated'
const COOKED_WORDS = new RegExp(`\\b(?:${COOKED_WORD})\\b`, 'i')
// Strips a full cook-state clause — "boiled or poached", "cooked, dry heat",
// "cooked, boiled, drained" — as one phrase; a dangling "or"/"drained" left in
// the label would keep two phrasings of the same food from merging downstream.
const COOKED_PHRASE = new RegExp(
  `,?\\s*\\b(?:(?:dry|moist)\\s+heat|drained|(?:${COOKED_WORD})(?:\\s+(?:or|and)\\s+(?:${COOKED_WORD}))*)\\b`,
  'gi',
)
// "dry" alone marks a raw/dry product ("rice, dry") — but not in USDA's
// "cooked, dry heat" or "dry roasted", which describe cooking methods.
const RAW_WORDS = /\b(raw|uncooked|unprepared|unheated|dried)\b|\bdry\b(?!\s+(?:heat|roast))/i

const COOKED_TO_RAW: { match: RegExp; factor: number }[] = [
  // Boiled/poached eggs weigh what the raw egg did; the rule exists so the
  // cooked descriptor gets stripped and the line merges with raw-egg lines.
  { match: /\beggs?\b/i, factor: 1 },
  // Bacon renders away most of its weight; must precede the pork rule.
  { match: /\bbacon\b/i, factor: 2.5 },
  { match: /\brice\b/i, factor: 1 / 3 },
  { match: /\b(pasta|spaghetti|penne|noodle|macaroni)\b/i, factor: 0.5 },
  { match: /\b(quinoa|farro|barley|bulgur|couscous|buckwheat|millet|amaranth|teff|grits|polenta)\b/i, factor: 0.4 },
  { match: /\b(oat|oatmeal|porridge)\b/i, factor: 0.4 },
  { match: /\b(lentil|bean|chickpea|garbanzo|black bean|kidney bean|pinto)\b/i, factor: 0.4 },
  { match: /\b(ground)\b.*\b(beef|turkey|chicken|pork|lamb)\b/i, factor: 1.3 },
  { match: /\b(chicken|turkey|duck|poultry|ostrich|emu|quail|pheasant|cornish)\b/i, factor: 1.33 },
  { match: /\b(beef|steak|pork|lamb|veal|bison|venison|elk|goat|rabbit|boar|game)\b/i, factor: 1.35 },
  {
    match: /\b(fish|salmon|tuna|cod|halibut|tilapia|shrimp|mollusks?|crustaceans?|oysters?|clams?|mussels?|scallops?|crab|lobster|crawfish|crayfish|octopus|squid|calamari|mackerel|trout|sardines?|herring|snapper|bass|flounder|sole|haddock|pollock|catfish|swordfish|mahi|perch|walleye|grouper|anchov(?:y|ies))\b/i,
    factor: 1.25,
  },
  // Mushrooms and leafy greens shed a lot of water in the pan.
  { match: /\bmushrooms?\b/i, factor: 1.5 },
  { match: /\b(spinach|kale|chard|collards?|greens)\b/i, factor: 1.3 },
  { match: /\b(potato|sweet potato|yam)\b/i, factor: 0.9 },
]

function stripCookedWords(label: string): string {
  return label
    .replace(COOKED_PHRASE, '')
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/,$/, '')
}

export function cookedGramsToRaw(label: string, grams: number): { grams: number; label: string } {
  if (!COOKED_WORDS.test(label) || RAW_WORDS.test(label)) return { grams, label }
  for (const rule of COOKED_TO_RAW) {
    if (rule.match.test(label)) {
      return { grams: grams * rule.factor, label: `${stripCookedWords(label)}, raw` }
    }
  }
  // Unknown food: keep the cooked weight (most uncovered foods — breads,
  // vegetables, fruit — cook near 1:1) but still strip the cook-state words
  // so every phrasing of the same food merges into one grocery line.
  return { grams, label: stripCookedWords(label) }
}
