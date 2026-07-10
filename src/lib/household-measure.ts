// Household-measure display for client-facing ingredient amounts. Converts
// gram weights into cups / tablespoons / teaspoons / counts using the same
// per-ingredient densities the recipe parser uses, so a client who doesn't
// want to weigh food still lands close to her macros. Pure module (no server
// deps) so the conversions are unit-testable.
// Explicit .ts extensions so this module also loads under `node --test
// --experimental-strip-types`, which resolves relative imports literally.
import { cookedGramsToRaw } from './cooked-to-raw.ts'
import { cleanIngredientText, ingredientWeighState } from './client-portion.ts'
import { lookupCupGrams } from './recipes/paste-parser.ts'

// Approx grams per common shopping unit, so we can convert weights into what
// a shopper actually reaches for. Wider tolerances than the recipe parser —
// household displays round generously ("about 1 tsp", "2 cloves").
const HOUSEHOLD_UNITS: Array<{ match: RegExp; label: string; gramsPer: number; template?: (n: number) => string }> = [
  // Cloves of garlic — count-based, no oz/g needed. Garlic powder/salt are
  // spices (rules below), and bare "cloves" is the ground spice, not garlic.
  { match: /\bgarlic\b(?!\s*(?:powder|salt|bread))/, label: 'clove', gramsPer: 3, template: (n) => `${n} clove${n === 1 ? '' : 's'} garlic` },
  // Whole eggs — but not egg whites, which are bought by the carton and must
  // never display as "N large eggs" next to a real whole-egg line.
  { match: /\beggs?\b(?!\s*whites?)/, label: 'egg', gramsPer: 50, template: (n) => `${n} large egg${n === 1 ? '' : 's'}` },
  // Dried leafy herbs (~1g/tsp).
  { match: /\b(oregano|basil|thyme|rosemary|parsley|sage|dill|tarragon|marjoram|italian seasoning|bay leaf|bay leaves)\b/, label: 'tsp', gramsPer: 1 },
  // Medium ground spices (~2g/tsp).
  { match: /\b(cumin|black pepper|white pepper|ground pepper|chili powder|paprika|cayenne|coriander|ginger|cardamom|cloves? ground|allspice|red pepper flakes?|taco seasoning|garam masala|curry powder)\b/, label: 'tsp', gramsPer: 2 },
  // Salt (~6g/tsp).
  { match: /\bsalt\b/, label: 'tsp', gramsPer: 6 },
  // Powders (~3g/tsp): garlic powder, onion powder, turmeric.
  { match: /\b(garlic powder|onion powder|turmeric)\b/, label: 'tsp', gramsPer: 3 },
  // Cinnamon, nutmeg (~2.5g/tsp).
  { match: /\b(cinnamon|nutmeg|mace)\b/, label: 'tsp', gramsPer: 2.5 },
  // Extracts (~4g/tsp).
  { match: /\b(vanilla extract|almond extract|extract)\b/, label: 'tsp', gramsPer: 4 },
  // Oils (~14g/tbsp).
  { match: /\b(olive oil|avocado oil|coconut oil|canola oil|vegetable oil|sesame oil|oil)\b/, label: 'tbsp', gramsPer: 14 },
  // Butter (~14g/tbsp).
  { match: /\bbutter\b|\bghee\b/, label: 'tbsp', gramsPer: 14 },
  // Nut butters (~16g/tbsp).
  { match: /\b(peanut butter|almond butter|cashew butter|sunflower butter|nut butter)\b/, label: 'tbsp', gramsPer: 16 },
  // Honey / maple / molasses (~21g/tbsp).
  { match: /\b(honey|maple syrup|agave|molasses)\b/, label: 'tbsp', gramsPer: 21 },
]

/** Round to a friendly cooking increment: ¼, ½, ¾ up through 4, then whole. */
function friendlyCount(value: number): string {
  if (value < 0.375) return '¼'
  if (value < 0.625) return '½'
  if (value < 0.875) return '¾'
  if (value < 1.25) return '1'
  if (value < 1.625) return '1¼'
  if (value < 1.875) return '1½'
  if (value < 2.25) return '2'
  return String(Math.round(value))
}

// Kitchen-cup fractions include thirds (⅓ cup is a standard measure); the
// spoon rounding above would misread ⅓ as ¼, a 25% error on a real recipe.
const CUP_FRACTIONS: [number, string][] = [
  [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, ''],
]

function friendlyCups(value: number): { text: string; plural: boolean } {
  const whole = Math.floor(value + 0.0001)
  const rest = value - whole
  let fraction = ''
  let carry = 0
  if (rest >= 0.125) {
    let best: [number, string] = CUP_FRACTIONS[0]
    for (const candidate of CUP_FRACTIONS) {
      if (Math.abs(rest - candidate[0]) < Math.abs(rest - best[0])) best = candidate
    }
    fraction = best[1]
    if (best[0] === 1) carry = 1
  }
  const wholePart = whole + carry
  const text = `${wholePart > 0 ? wholePart : ''}${fraction}`
  return { text: text || '¼', plural: wholePart > 1 || (wholePart === 1 && fraction !== '') }
}

function cupsText(cups: number, label: string): string {
  const { text, plural } = friendlyCups(cups)
  return `${text} cup${plural ? 's' : ''} ${label}`
}

// Spoon counts escalate to the next unit so bulk amounts stay readable:
// 3 tsp make a tbsp, 4+ tbsp read as cups. Without the second step, a
// month of salt on the grocery list shows up as "39 tbsp sea salt".
function spoonMeasure(count: number, unit: string, label: string): string {
  if (unit === 'tsp' && count < 3) return `${friendlyCount(count)} tsp ${label}`
  const tbsp = unit === 'tsp' ? count / 3 : count
  if (tbsp < 4) return `${friendlyCount(tbsp)} tbsp ${label}`
  return cupsText(tbsp / 16, label)
}

/** "200" grams → "7 oz"; "907" → "2 lb". Mirrors the grocery-list rounding. */
export function approxWeightMeasure(grams: number): string {
  if (grams >= 454) {
    const lb = Math.round((grams / 453.59) * 4) / 4
    return `${lb.toFixed(2).replace(/\.?0+$/, '')} lb`
  }
  const oz = Math.max(0.5, Math.round((grams / 28.35) * 2) / 2)
  return `${oz.toFixed(1).replace(/\.0$/, '')} oz`
}

/**
 * Gram weight as an easy kitchen measure ("¾ cup rolled oats", "2 tbsp olive
 * oil", "3 large eggs"), or null when the food has no known count, spoon, or
 * cup density — callers fall back to oz/lb.
 */
export function householdMeasure(label: string, grams: number): string | null {
  const lower = label.toLowerCase()
  for (const unit of HOUSEHOLD_UNITS) {
    if (unit.match.test(lower)) {
      const count = grams / unit.gramsPer
      if (unit.template) return unit.template(Math.max(1, Math.round(count)))
      return spoonMeasure(count, unit.label, label)
    }
  }
  const cupGrams = lookupCupGrams(label)
  if (cupGrams) {
    const cups = grams / cupGrams
    if (cups >= 0.22) return cupsText(cups, label)
    const tbsp = cups * 16
    if (tbsp >= 0.7) return `${friendlyCount(tbsp)} tbsp ${label}`
    return `${friendlyCount(tbsp * 3)} tsp ${label}`
  }
  return null
}

const FRACTION_VALUES: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125,
}
const TSP_PER_UNIT: Record<string, number> = {
  tsp: 1, teaspoon: 1, teaspoons: 1,
  tbsp: 3, tablespoon: 3, tablespoons: 3,
  cup: 48, cups: 48,
}

/**
 * Coach-typed household amounts back into grams ("2 tbsp salt" → 36g salt,
 * "12 cloves garlic" → 36g, "9 large eggs" → 450g), using the same densities
 * the display side uses — so typed lines and USDA gram lines can merge into
 * one grocery entry instead of shadowing each other. Null when the amount or
 * the food's density is unknown; callers keep the line as typed.
 */
export function typedMeasureToGrams(line: string): { grams: number; label: string } | null {
  const eggs = line.match(/^(\d+)\s*(?:extra-?large|large|medium|small)?\s*eggs?$/i)
  if (eggs) return { grams: Number(eggs[1]) * 50, label: 'eggs' }

  const match = line.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔⅛])?\s*(tsp|teaspoons?|tbsp|tablespoons?|cups?|cloves?)\s+(?:of\s+)?(.+)$/i)
  if (!match) return null
  const count = (match[1] ? parseFloat(match[1]) : 0) + (match[2] ? FRACTION_VALUES[match[2]] : 0)
  if (!count || !Number.isFinite(count)) return null
  const unit = match[3].toLowerCase()
  const label = match[4].trim()

  if (unit.startsWith('clove')) return { grams: count * 3, label }

  const teaspoons = count * (TSP_PER_UNIT[unit] ?? 0)
  if (!teaspoons) return null
  const lower = label.toLowerCase()
  for (const entry of HOUSEHOLD_UNITS) {
    if (entry.label !== 'tsp' && entry.label !== 'tbsp') continue
    if (!entry.match.test(lower)) continue
    const gramsPerTsp = entry.label === 'tsp' ? entry.gramsPer : entry.gramsPer / 3
    return { grams: teaspoons * gramsPerTsp, label }
  }
  return null
}

export type PrepLine = {
  /** Precise text, e.g. "200g chicken breast, raw" */
  grams: string
  /** Easy text, e.g. "7 oz chicken breast, raw" or "1 cup rolled oats" */
  easy: string
  state: 'cooked' | 'raw' | null
}

/**
 * Client-facing shopping & prep list: every gram line converted to its raw
 * (pre-cooking) buying weight, offered both as exact grams and as an easy
 * household measure. Lines whose cooked→raw factor is unknown keep their
 * cooked weight and state marker; lines without a leading gram amount pass
 * through unchanged in both modes.
 */
export function shoppingPrepLines(ingredients: string[]): PrepLine[] {
  const lines: PrepLine[] = []
  for (const raw of ingredients) {
    const cleaned = cleanIngredientText(raw)
    if (!cleaned) continue
    const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*g\b\s*(.+)$/i)
    if (!match) {
      lines.push({ grams: cleaned, easy: cleaned, state: ingredientWeighState(cleaned) })
      continue
    }
    const { grams, label } = cookedGramsToRaw(match[2].trim(), Number(match[1]))
    lines.push({
      grams: `${Math.round(grams)}g ${label}`,
      easy: householdMeasure(label, grams) ?? `${approxWeightMeasure(grams)} ${label}`,
      state: ingredientWeighState(label),
    })
  }
  return lines
}

/**
 * Grocery-friendly amount from grams: cloves, tsp/tbsp, oz, lb depending on
 * what a shopper would actually count. Skips grams entirely — the meal plan
 * shows precise grams for weighing at cook time; the shopping list is about
 * what to grab off the shelf.
 */
export function groceryDisplay(item: string): string {
  const cleaned = cleanIngredientText(item)
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*g\b\s*(.+)$/i)
  if (!match) return cleaned
  const parsedGrams = parseFloat(match[1])
  if (!Number.isFinite(parsedGrams) || parsedGrams <= 0) return cleaned

  const { grams, label } = cookedGramsToRaw(match[2].trim(), parsedGrams)
  const lower = label.toLowerCase()

  // Match against practical shopping units first — herbs/spices/cloves/eggs.
  for (const unit of HOUSEHOLD_UNITS) {
    if (unit.match.test(lower)) {
      const count = grams / unit.gramsPer
      if (unit.template) {
        return unit.template(Math.max(1, Math.round(count)))
      }
      return spoonMeasure(count, unit.label, label)
    }
  }

  // Bulk items: lbs when a pound or more, oz otherwise. Round oz to 0.5.
  return `${label}, ${approxWeightMeasure(grams)}`
}
