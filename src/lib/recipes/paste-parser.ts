// Converts a freeform recipe ingredient line into a gram weight without
// hitting USDA. Used by paste-mode recipe entry where the user provides
// the recipe's overall macros and we only need per-ingredient grams to
// support client portion scaling.
//
// Confidence:
//   high   — weight unit (g/oz/lb/kg) or precise liquid measure on a liquid
//   medium — known-ingredient volume or sized count ("1 cup flour", "1 large egg")
//   fuzzy  — unknown ingredient, unsized count, or unit we don't recognize

export type ParseConfidence = 'high' | 'medium' | 'fuzzy'

export type ParsedIngredient = {
  raw: string
  name: string
  grams: number
  confidence: ParseConfidence
  reason?: string
}

const WEIGHT_UNITS: Record<string, number> = {
  g: 1, gram: 1, grams: 1, gr: 1,
  kg: 1000, kilo: 1000, kilos: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001, milligram: 0.001, milligrams: 0.001,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
}

const LIQUID_VOLUME_ML: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000,
  tsp: 4.93, teaspoon: 4.93, teaspoons: 4.93,
  tbsp: 14.79, tablespoon: 14.79, tablespoons: 14.79, 'tbsp.': 14.79,
  cup: 236.59, cups: 236.59, c: 236.59,
  pint: 473.18, pints: 473.18, pt: 473.18,
  quart: 946.35, quarts: 946.35, qt: 946.35,
  'fl': 29.57, 'floz': 29.57, 'fl.oz': 29.57, 'fl.oz.': 29.57,
  gallon: 3785.41, gallons: 3785.41, gal: 3785.41,
}

// grams per 1 cup of the named ingredient. Used when the unit is a volume
// but the ingredient is solid (so density != 1g/ml).
const CUP_GRAMS: Array<{ match: RegExp; grams: number }> = [
  // Oils & fats — liquid but density ≠ water
  { match: /\bolive oil\b|\bvegetable oil\b|\bcanola oil\b|\boil\b/, grams: 216 },
  { match: /\bbutter\b/, grams: 227 },
  { match: /\bghee\b/, grams: 220 },
  { match: /\bcoconut oil\b/, grams: 218 },
  { match: /\bpeanut butter\b|\balmond butter\b|\bcashew butter\b|\bsunflower butter\b|\bnut butter\b/, grams: 258 },
  { match: /\bhoney\b|\bmaple syrup\b|\bagave\b|\bmolasses\b/, grams: 340 },
  { match: /\bgreek yogurt\b|\byogurt\b|\bskyr\b/, grams: 245 },
  { match: /\bcottage cheese\b|\bricotta\b/, grams: 226 },
  { match: /\bsour cream\b/, grams: 230 },
  { match: /\bmayo\b|\bmayonnaise\b/, grams: 220 },
  // Dry pantry
  { match: /\b(all[- ]?purpose|ap|bread|whole[- ]?wheat|cake|pastry)?\s*flour\b/, grams: 125 },
  { match: /\balmond flour\b/, grams: 96 },
  { match: /\bcoconut flour\b/, grams: 112 },
  { match: /\boat flour\b/, grams: 92 },
  { match: /\b(rolled|old[- ]?fashioned|quick) oats?\b|\boatmeal\b|\boats\b/, grams: 90 },
  { match: /\bsugar\b/, grams: 200 },
  { match: /\bbrown sugar\b/, grams: 213 },
  { match: /\bpowdered sugar\b|\bicing sugar\b|\bconfectioners\b/, grams: 120 },
  { match: /\bcocoa\b/, grams: 85 },
  { match: /\bbaking (powder|soda)\b/, grams: 220 },
  { match: /\bcornstarch\b|\barrowroot\b/, grams: 128 },
  { match: /\bsalt\b/, grams: 273 },
  { match: /\bbreadcrumbs?\b|\bpanko\b/, grams: 108 },
  // Grains / pasta dry
  { match: /\b(white|jasmine|basmati|long[- ]?grain|short[- ]?grain) rice\b|\brice\b/, grams: 185 }, // raw
  { match: /\b(brown|wild) rice\b/, grams: 190 },
  { match: /\bquinoa\b/, grams: 170 },
  { match: /\bcouscous\b/, grams: 173 },
  { match: /\bpasta\b|\bmacaroni\b|\bpenne\b|\bfusilli\b|\bspaghetti\b|\brigatoni\b/, grams: 100 }, // dry pasta
  // Legumes
  { match: /\b(black|kidney|pinto|cannellini|navy|chickpeas?|garbanzo) beans?\b|\bchickpeas?\b|\blentils?\b/, grams: 175 }, // cooked
  // Produce, common chops — more specific patterns first.
  { match: /\bcherry tomato\b|\bgrape tomato\b/, grams: 150 },
  { match: /\bbell pepper\b/, grams: 150 }, // chopped
  { match: /\bspinach\b|\barugula\b|\bkale\b|\blettuce\b|\bgreen\b/, grams: 30 }, // raw, packed loose
  { match: /\bbasil\b|\bcilantro\b|\bparsley\b|\bmint\b|\bdill\b|\bchive\b|\bherb\b/, grams: 24 }, // fresh, chopped
  { match: /\bbroccoli\b|\bcauliflower\b/, grams: 90 },
  { match: /\bonion\b/, grams: 160 }, // chopped
  { match: /\btomato\b/, grams: 180 }, // chopped/diced
  { match: /\bpepper\b/, grams: 150 }, // chopped — generic, after bell pepper
  { match: /\bcarrot\b/, grams: 128 }, // chopped
  { match: /\bcelery\b/, grams: 101 },
  { match: /\bcucumber\b/, grams: 119 },
  { match: /\bzucchini\b|\bsquash\b/, grams: 124 },
  { match: /\bmushroom\b/, grams: 70 }, // sliced
  { match: /\bcorn\b/, grams: 145 }, // kernels
  { match: /\bberry\b|\bblueber|raspber|strawber|blackber/, grams: 150 },
  // Cheese (shredded/grated)
  { match: /\bparmesan\b|\bpecorino\b|\bromano\b/, grams: 90 }, // grated
  { match: /\bmozzarella\b|\bcheddar\b|\bmonterey\b|\bswiss\b|\bcheese\b/, grams: 113 }, // shredded
  { match: /\bfeta\b/, grams: 150 },
  // Nuts & seeds
  { match: /\balmonds?\b|\bcashews?\b|\bwalnuts?\b|\bpecans?\b|\bpistachios?\b|\bnuts?\b/, grams: 140 },
  { match: /\bsunflower seeds?\b|\bpumpkin seeds?\b|\bchia\b|\bflax\b|\bsesame\b/, grams: 145 },
  // Dried spices & seasonings — densities approx, calibrated to common tsp/cup conversions.
  // Light leafy herbs (~1g/tsp = ~48g/cup): oregano, basil, thyme, rosemary, parsley, sage, mint, dill, tarragon, marjoram, italian seasoning, herbes de provence
  { match: /\b(oregano|basil|thyme|rosemary|parsley|sage|dill|tarragon|marjoram|italian seasoning|herbes de provence|herbs? de provence|bay leaf|bay leaves)\s*(,?\s*(dried|crushed|ground))?\b/, grams: 48 },
  // Medium-density ground spices (~2g/tsp = ~96g/cup): cumin, black pepper, chili powder, paprika, cayenne, coriander, ginger, mustard, fennel, allspice, cardamom, cloves, anise, taco seasoning, italian, garam masala, curry powder
  { match: /\b(ground cumin|cumin|black pepper|white pepper|ground pepper|chili powder|paprika|smoked paprika|cayenne|coriander|ground coriander|ground ginger|mustard powder|dry mustard|fennel|allspice|cardamom|cloves?|ground cloves?|anise|star anise|taco seasoning|garam masala|curry powder|five spice|red pepper flakes?|crushed red pepper|chinese five spice)\b/, grams: 96 },
  // Powders (~3g/tsp = ~144g/cup): garlic powder, onion powder, turmeric
  { match: /\b(garlic powder|granulated garlic|onion powder|granulated onion|turmeric)\b/, grams: 144 },
  // Cinnamon, nutmeg (~2.6g/tsp = ~125g/cup)
  { match: /\b(ground cinnamon|cinnamon|nutmeg|ground nutmeg|mace)\b/, grams: 125 },
  // Vanilla & extracts (~4.2g/tsp = ~200g/cup — water-like syrups)
  { match: /\b(vanilla extract|almond extract|extract)\b/, grams: 208 },
  // Liquids ~= water
  { match: /\b(water|broth|stock|milk|almond milk|oat milk|soy milk|coconut milk|cream|half[- ]and[- ]half|wine|juice|vinegar|soy sauce|tamari|sauce|salsa|marinara|tomato sauce|crushed tomatoes|diced tomatoes|tomato paste)\b/, grams: 240 },
]

// "1 large egg" style. Patterns keyed by ingredient name → gram weight per item.
type CountItem = { match: RegExp; defaultGrams: number; sized?: Record<string, number> }
const COUNT_ITEMS: CountItem[] = [
  { match: /\begg\b|\beggs\b/, defaultGrams: 50, sized: { small: 38, medium: 44, large: 50, 'extra large': 56, 'xl': 56, jumbo: 63 } },
  { match: /\bgarlic clove\b|\bclove of garlic\b|\bclove\b/, defaultGrams: 3 },
  { match: /\bbanana\b/, defaultGrams: 118, sized: { small: 81, medium: 118, large: 136 } },
  { match: /\bapple\b/, defaultGrams: 182, sized: { small: 149, medium: 182, large: 223 } },
  { match: /\bonion\b/, defaultGrams: 110, sized: { small: 70, medium: 110, large: 150 } },
  { match: /\btomato\b/, defaultGrams: 123, sized: { small: 90, medium: 123, large: 182 } },
  { match: /\blemon\b/, defaultGrams: 84 },
  { match: /\blime\b/, defaultGrams: 67 },
  { match: /\borange\b/, defaultGrams: 131 },
  { match: /\bavocado\b/, defaultGrams: 150 },
  { match: /\bbell pepper\b|\bpepper\b/, defaultGrams: 119 },
  { match: /\bcarrot\b/, defaultGrams: 61, sized: { small: 50, medium: 61, large: 72 } },
  { match: /\bpotato\b/, defaultGrams: 213, sized: { small: 170, medium: 213, large: 369 } },
  { match: /\bsweet potato\b/, defaultGrams: 130 },
  { match: /\bzucchini\b/, defaultGrams: 196 },
  { match: /\bcucumber\b/, defaultGrams: 301 },
  { match: /\bchicken breast\b/, defaultGrams: 174 },
  { match: /\bchicken thigh\b/, defaultGrams: 80 },
  { match: /\bear of corn\b|\bcorn on the cob\b|\bears?\b/, defaultGrams: 90 }, // kernels per ear
  { match: /\bslice of bread\b|\bbread slice\b/, defaultGrams: 28 },
  { match: /\btortilla\b/, defaultGrams: 49 },
  { match: /\bpinch\b/, defaultGrams: 0.4 },
  { match: /\bdash\b/, defaultGrams: 0.6 },
  { match: /\bsprig\b/, defaultGrams: 1 },
  { match: /\bhandful\b/, defaultGrams: 30 },
]

const DEFAULT_SOLID_CUP_GRAMS = 150 // unknown chopped solid

// Standard per-can / per-jar drained weights for common pantry staples.
// 15-oz can = 425g undrained; legumes/vegetables drain to ~240g.
const CAN_ITEMS: Array<{ match: RegExp; grams: number }> = [
  { match: /\b(black|kidney|pinto|cannellini|navy|great northern|chickpea|garbanzo|white|red) beans?\b/, grams: 240 },
  { match: /\bchickpeas?\b|\bgarbanzos?\b/, grams: 240 },
  { match: /\blentils?\b/, grams: 240 },
  { match: /\brefried beans?\b/, grams: 454 },
  { match: /\bcorn\b/, grams: 240 },
  { match: /\bgreen beans?\b/, grams: 240 },
  { match: /\bpeas?\b/, grams: 240 },
  { match: /\bcrushed tomato/, grams: 411 },
  { match: /\bdiced tomato/, grams: 411 },
  { match: /\bwhole tomato/, grams: 411 },
  { match: /\bfire[- ]roasted tomato/, grams: 411 },
  { match: /\btomato sauce\b/, grams: 411 },
  { match: /\btomato paste\b/, grams: 170 },
  { match: /\btuna\b/, grams: 142 }, // 5 oz drained
  { match: /\bchicken\b/, grams: 283 }, // 12.5 oz canned chicken
  { match: /\bsalmon\b/, grams: 213 }, // 7.5 oz can
  { match: /\bsardines?\b/, grams: 92 }, // 3.75 oz tin
  { match: /\bcoconut milk\b|\bcoconut cream\b/, grams: 400 }, // 13.5 oz
  { match: /\bolives?\b/, grams: 110 }, // pitted/drained
  { match: /\bartichoke\b/, grams: 240 },
  { match: /\bsalsa\b|\bmarinara\b|\bpasta sauce\b|\bpizza sauce\b|\bsauce\b/, grams: 454 }, // typical 16 oz jar
  { match: /\bpumpkin\b/, grams: 425 }, // 15 oz
  { match: /\bbroth\b|\bstock\b/, grams: 425 }, // 14.5 oz
  { match: /\bsoup\b/, grams: 305 },
  { match: /\bmushrooms?\b/, grams: 113 }, // 4 oz drained
  { match: /\bgreen chiles?\b|\bdiced chiles?\b/, grams: 113 }, // 4 oz
]

function lookupCanGrams(name: string): number | null {
  const lower = normalizeForLookup(name)
  for (const { match, grams } of CAN_ITEMS) {
    if (match.test(lower)) return grams
  }
  return null
}

// "can", "cans", "canned" all mean the same thing for parsing purposes.
const CAN_UNITS = new Set(['can', 'cans', 'canned', 'jar', 'jars', 'tin', 'tins'])

// "1 1/2", "1/2", "0.5", "1.5"
function parseQuantity(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // unicode fractions
  const unicodeMap: Record<string, number> = {
    '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
    '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
    '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  }
  const unicode = unicodeMap[trimmed]
  if (unicode !== undefined) return unicode

  const mixedUnicode = trimmed.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/)
  if (mixedUnicode) return Number(mixedUnicode[1]) + (unicodeMap[mixedUnicode[2]] ?? 0)

  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])

  const fraction = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])

  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

// Quantity forms: "1 1/2", "1/2", "1.5", "1½", "½".
const QTY_PATTERN = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s*[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`
const QTY_UNIT_RE = new RegExp(`^(${QTY_PATTERN})\\s*([a-zA-Z.]+)?\\s+(.*)$`)

function normalizeUnit(raw: string | undefined): string {
  return (raw ?? '')
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/\.$/, '')
    .trim()
}

function stripDescriptors(name: string): string {
  // Drop parentheticals, trailing prep clauses, and leading prep adjectives.
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/,\s*(diced|chopped|sliced|minced|crushed|grated|shredded|cubed|halved|quartered|peeled|cooked|raw|fresh|frozen|drained|rinsed|melted|softened|to taste|for (serving|garnish|drizzling|topping)|plus more.*|kernels.*|optional.*)$/gi, '')
    .replace(/^(diced|chopped|sliced|minced|crushed|grated|shredded|cubed|peeled|cooked|raw|fresh|frozen)\s+/i, '')
    .replace(/[,\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Normalize plurals so "tomatoes" matches `\btomato\b`. We tolerate over-stemming
// ("tomatoe" intermediate form) — only the final match against the regex matters.
function normalizeForLookup(name: string): string {
  return ` ${name.toLowerCase()
    .replace(/ies\b/g, 'y')
    .replace(/oes\b/g, 'o')
    .replace(/sses\b/g, 'ss')
    .replace(/(\w{3,})s\b/g, '$1')} `
}

function lookupCupGrams(name: string): number | null {
  const lower = normalizeForLookup(name)
  for (const { match, grams } of CUP_GRAMS) {
    if (match.test(lower)) return grams
  }
  return null
}

function lookupCount(name: string): CountItem | null {
  const lower = normalizeForLookup(name)
  for (const item of COUNT_ITEMS) {
    if (item.match.test(lower)) return item
  }
  return null
}

function findSizeWord(name: string, sized: Record<string, number> | undefined): { word: string; grams: number } | null {
  if (!sized) return null
  const lower = name.toLowerCase()
  for (const word of Object.keys(sized).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`).test(lower)) {
      return { word, grams: sized[word] }
    }
  }
  return null
}

export function parseIngredientLine(raw: string): ParsedIngredient {
  const line = raw.trim().replace(/^[-*•]\s*/, '')
  if (!line) return { raw, name: '', grams: 0, confidence: 'fuzzy', reason: 'Empty line.' }

  // "to taste" — return a tiny placeholder, won't affect plating math meaningfully.
  if (/^[a-z, ]+to taste\b/i.test(line) || /\bto taste\b/i.test(line)) {
    return { raw, name: line.replace(/,?\s*to taste/i, '').trim() || line, grams: 1, confidence: 'medium', reason: 'Seasoning to taste — using nominal 1g.' }
  }

  const match = line.match(QTY_UNIT_RE)
  if (!match) {
    return { raw, name: line, grams: 0, confidence: 'fuzzy', reason: 'No quantity found.' }
  }

  const qty = parseQuantity(match[1])
  if (qty === null || qty <= 0) {
    return { raw, name: line, grams: 0, confidence: 'fuzzy', reason: 'Could not read quantity.' }
  }

  const unit = normalizeUnit(match[2])
  const rest = stripDescriptors(match[3] ?? '')

  // Weight unit — exact
  if (unit && WEIGHT_UNITS[unit]) {
    return { raw, name: rest || line, grams: round1(qty * WEIGHT_UNITS[unit]), confidence: 'high' }
  }

  // Can / jar / tin — match by ingredient, fall back to generic 425g (15 oz)
  if (unit && CAN_UNITS.has(unit)) {
    const canGrams = lookupCanGrams(rest)
    if (canGrams !== null) {
      return { raw, name: rest, grams: round1(qty * canGrams), confidence: 'medium' }
    }
    return {
      raw,
      name: rest,
      grams: round1(qty * 425),
      confidence: 'fuzzy',
      reason: `Unknown canned/jarred item — used standard 15 oz (425g) per ${unit}.`,
    }
  }

  // Volume unit
  if (unit && LIQUID_VOLUME_ML[unit]) {
    const ml = qty * LIQUID_VOLUME_ML[unit]
    const cupGrams = lookupCupGrams(rest)
    if (cupGrams !== null) {
      // Convert ml→cup-fraction then multiply by known per-cup grams.
      const grams = (ml / LIQUID_VOLUME_ML.cup) * cupGrams
      return { raw, name: rest, grams: round1(grams), confidence: 'medium' }
    }
    // Unknown solid — assume water-like density (~1g/ml) only for true liquid units.
    if (unit === 'ml' || unit === 'l' || unit === 'liter' || unit === 'liters' || unit === 'milliliter' || unit === 'milliliters') {
      return { raw, name: rest, grams: round1(ml), confidence: 'medium' }
    }
    // Volume of unknown solid — use generic chopped-solid density and flag fuzzy.
    return {
      raw,
      name: rest,
      grams: round1((ml / LIQUID_VOLUME_ML.cup) * DEFAULT_SOLID_CUP_GRAMS),
      confidence: 'fuzzy',
      reason: `Unknown ingredient — used average ${DEFAULT_SOLID_CUP_GRAMS}g/cup.`,
    }
  }

  // Count-based ("1 large egg", "2 cloves garlic")
  // unit may actually be the size word ("large", "medium") OR a count noun ("clove", "ear", "slice", "pinch")
  const merged = unit ? `${unit} ${rest}`.trim() : rest
  const item = lookupCount(merged)
  if (item) {
    const sizeHit = findSizeWord(merged, item.sized)
    if (sizeHit) {
      return { raw, name: stripDescriptors(merged), grams: round1(qty * sizeHit.grams), confidence: 'medium' }
    }
    return {
      raw,
      name: stripDescriptors(merged),
      grams: round1(qty * item.defaultGrams),
      confidence: item.defaultGrams >= 100 ? 'fuzzy' : 'medium',
      reason: item.defaultGrams >= 100 ? `Assumed average ${item.defaultGrams}g per item — varies by size.` : undefined,
    }
  }

  // Unknown unit token — treat as a count of unknown things, fuzzy fallback.
  return {
    raw,
    name: stripDescriptors(merged),
    grams: 0,
    confidence: 'fuzzy',
    reason: `Couldn't recognize unit "${unit}". Enter grams manually.`,
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function parseIngredientBlock(text: string): ParsedIngredient[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseIngredientLine)
}

export function formatGramsLine(parsed: ParsedIngredient): string {
  if (parsed.grams <= 0) return parsed.raw
  return `${parsed.grams}g ${parsed.name || parsed.raw}`
}
