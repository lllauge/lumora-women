// Client-facing portion math shared by the coaching portal pages. Pure module
// (no server deps) so the portion display logic can be unit tested alongside
// nutrition-math — the portal must always show weights that match the saved
// serving macros.
import type { CoachingPlanDraft } from './coaching-plan-schema'
import { rawGramsToCookedEstimate } from './cooked-to-raw.ts'
import { isExcludedNutritionIngredient } from './nutrition-ingredient.ts'

const FOOD_DATABASE_TOKEN = /\[(?:fdc:\d+|curated:[a-z0-9-]+)\]\s*/gi

// USDA-matched lines carry the database's all-caps food descriptions
// ("EXTRA VIRGIN OLIVE OIL (CALIFORNIA OLIVE RANCH)"). Sentence-case them
// for client display; mixed-case text the coach typed passes through as-is.
function unshout(value: string): string {
  const letters = value.replace(/[^a-z]/gi, '')
  const uppercase = letters.replace(/[^A-Z]/g, '')
  if (letters.length < 4 || uppercase.length / letters.length < 0.8) return value
  return value
    .toLowerCase()
    .replace(/^((?:\d[\d.]*\s*g\s+)?)([a-z])/, (_, amount: string, letter: string) => `${amount}${letter.toUpperCase()}`)
    .replace(/([(,]\s*)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
}

/** Strip internal food-database tokens and collapse whitespace for client display. */
export function cleanIngredientText(value: string): string {
  return unshout(value.replace(FOOD_DATABASE_TOKEN, '').replace(/\s+/g, ' ').trim())
}

/** Leading gram amount of an ingredient line ("50g Sweet potato…" → 50). */
export function ingredientGrams(value: string): number | null {
  const match = cleanIngredientText(value).match(/^(\d+(?:\.\d+)?)\s*g\b/i)
  return match ? parseFloat(match[1]) : null
}

/** Ingredient name without the leading amount, trimmed to its first two comma segments. */
export function shortIngredientName(value: string): string {
  const withoutAmount = cleanIngredientText(value).replace(/^[\d.]+\s*(?:g|oz|lb|cups?|tbsp|tsp)\b\.?\s*/i, '')
  const segments = withoutAmount.split(',').map((s) => s.trim()).filter(Boolean)
  return segments.slice(0, 2).join(', ') || cleanIngredientText(value)
}

export const COOKED_WORDS = /\b(cooked|baked|roasted|grilled|poached|boiled|steamed|toasted|saut[eé]ed|scrambled|fried)\b/i
export const RAW_WORDS = /\b(raw|uncooked|dry|dried)\b/i

/** Whether the entry's weight refers to the food cooked or raw (from the USDA name). */
export function ingredientWeighState(value: string): 'cooked' | 'raw' | null {
  const v = cleanIngredientText(value)
  if (COOKED_WORDS.test(v)) return 'cooked'
  if (RAW_WORDS.test(v)) return 'raw'
  return null
}

function ingredientCount(value: string): { n: number; unit: string } | null {
  const match = cleanIngredientText(value).match(/\((\d+(?:\.\d+)?)\s*(extra-?large|large|medium|small)?\s*\)/i)
  return match ? { n: parseFloat(match[1]), unit: match[2]?.toLowerCase() ?? '' } : null
}

export type PortionLine = {
  grams: number | null
  name: string
  state: 'cooked' | 'raw' | null
  count: string | null
}

/**
 * The fraction of the full recipe that's the client's portion, mirroring the
 * server's resolvedServingMultiplier so displayed weights always match the
 * saved serving macros.
 *
 * Family plans (familyServings > 1, not individual style): a missing, 1.0, or
 * out-of-range multiplier means "default to equal share" — no client eats a
 * whole family pot. Only an actually carved share (0 < m < 1) is used as-is.
 *
 * Individual-style plans treat recipes as exact grams as entered: the saved
 * multiplier (or 1) applies even when the recipe declares family servings,
 * because that declaration is ignored by the plan's nutrition math.
 */
export function clientPortionFactor(
  recipe: CoachingPlanDraft['recipes'][number],
  individualPlanStyle = false,
): number {
  const multiplier = parseFloat(recipe.clientServingMultiplier)
  const familyServings = parseFloat(recipe.familyServings)
  const isFamily = !individualPlanStyle && Number.isFinite(familyServings) && familyServings > 1
  if (isFamily) {
    if (Number.isFinite(multiplier) && multiplier > 0 && multiplier < 1) return multiplier
    return 1 / familyServings
  }
  return Number.isFinite(multiplier) && multiplier > 0 && multiplier <= 4 ? multiplier : 1
}

/**
 * Per-ingredient weigh-out list for the client's portion: full-recipe gram
 * amounts scaled by her serving multiplier (family recipes get her carved
 * portion; individual recipes are eaten as entered). Counts like "(3 large)"
 * carry through when they scale to a whole number.
 */
export function clientPortionLines(
  recipe: CoachingPlanDraft['recipes'][number],
  individualPlanStyle = false,
): PortionLine[] {
  const factor = clientPortionFactor(recipe, individualPlanStyle)
  return recipe.ingredients
    .map((ing) => {
      const grams = ingredientGrams(ing)
      const rawCount = ingredientCount(ing)
      let count: string | null = null
      if (rawCount) {
        const scaled = rawCount.n * factor
        if (Math.abs(scaled - Math.round(scaled)) < 0.01 && Math.round(scaled) >= 1) {
          count = `${Math.round(scaled)}${rawCount.unit ? ` ${rawCount.unit}` : ''}`
        }
      }
      return {
        grams: grams !== null ? Math.round(grams * factor) : null,
        name: shortIngredientName(ing),
        state: ingredientWeighState(ing),
        count,
      }
    })
    .filter((line) => line.name)
}

/**
 * Estimated cooked weight of the client's plated portion, in grams. Family
 * recipes are cooked as one dish and her share is carved from the finished
 * food, so the portal shows her a cooked target rather than raw ingredient
 * weights she can't act on. Discarded brine/marinade lines are excluded; raw
 * ingredient grams are converted with kitchen-average yields, so the number is
 * a target, not a promise — rounded to 5g to read like the estimate it is.
 * Returns null when no ingredient carries a gram amount.
 */
export function estimatedCookedPortionGrams(
  recipe: CoachingPlanDraft['recipes'][number],
  individualPlanStyle = false,
): number | null {
  const factor = clientPortionFactor(recipe, individualPlanStyle)
  let total = 0
  let hasGrams = false
  for (const ing of recipe.ingredients) {
    if (isExcludedNutritionIngredient(ing)) continue
    const cleaned = cleanIngredientText(ing)
    const grams = ingredientGrams(ing)
    if (grams === null) continue
    hasGrams = true
    total += rawGramsToCookedEstimate(cleaned, grams)
  }
  if (!hasGrams) return null
  return Math.round((total * factor) / 5) * 5
}

/** Compact one-line weigh-out summary: "3 large eggs · 50g sweet potato (cooked)". */
export function portionSummaryLine(
  recipe: CoachingPlanDraft['recipes'][number],
  individualPlanStyle = false,
): string {
  const lines = clientPortionLines(recipe, individualPlanStyle).filter((line) => line.grams !== null || line.count)
  if (lines.length === 0) return ''
  return lines.map((line) => {
    if (line.count) {
      const n = parseInt(line.count, 10)
      const foodName = /egg/i.test(line.name) ? (n > 1 ? 'eggs' : 'egg') : line.name.split(',')[0].trim()
      return `${line.count} ${foodName}`
    }
    const nameMentionsState = COOKED_WORDS.test(line.name) || RAW_WORDS.test(line.name)
    const stateSuffix = nameMentionsState ? '' : line.state === 'raw' ? ' (raw)' : line.state === 'cooked' ? ' (cooked)' : ''
    return `${line.grams}g ${line.name}${stateSuffix}`
  }).join(' · ')
}

// Note lines that exist for Laura, not the client: where a recipe was
// imported from (she often adapts recipes, so the source shouldn't be shown),
// and the USDA calculation trail the draft pipeline appends for auditing.
const INTERNAL_NOTE_LINE = new RegExp(
  '^(?:'
  + 'source:\\s*\\S+'
  + '|usda calculated full-recipe nutrition\\b.*'
  + '|usda auto-scaling skipped\\b.*'
  + '|final macro-fitted client portion\\b.*'
  + ')$',
  'i',
)

/**
 * Recipe notes with coach-only lines removed for client display. Laura's own
 * tips pass through untouched.
 */
export function clientRecipeNotes(notes: string): string {
  return notes
    .split('\n')
    .filter((line) => !INTERNAL_NOTE_LINE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// [value, label, divide the dish into `parts`, serve `take` of them]
const FRACTIONS: [number, string, number, number][] = [
  [1, 'the whole recipe', 1, 1], [3 / 4, '¾', 4, 3], [2 / 3, '⅔', 3, 2], [3 / 5, '⅗', 5, 3],
  [1 / 2, 'half', 2, 1], [2 / 5, '⅖', 5, 2], [3 / 8, '⅜', 8, 3], [1 / 3, '⅓', 3, 1],
  [1 / 4, '¼', 4, 1], [1 / 5, '⅕', 5, 1], [1 / 6, '⅙', 6, 1], [1 / 8, '⅛', 8, 1],
]

export type PortionFraction = {
  label: string
  qualifier: 'generous' | 'scant' | null
  /** Divide the cooked dish into this many equal portions… */
  parts: number
  /** …and this many of them are the client's serving. */
  take: number
}

/**
 * The client's portion as an easy fraction of the cooked dish ("¼", "half"),
 * for nights she doesn't want to weigh food, with the matching division
 * ("split into 4, take 1") for portioning straight into containers. The
 * fraction must stay close to her true serving multiplier so the no-scale
 * portion still hits her macros: within 3% reads as exact; up to 12% off gets
 * a "generous"/"scant" steer; anything further from a kitchen fraction shows
 * nothing.
 */
export function portionFraction(factor: number): PortionFraction | null {
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1.02) return null
  let best: { label: string; parts: number; take: number; deviation: number } | null = null
  for (const [value, label, parts, take] of FRACTIONS) {
    const deviation = (factor - value) / value
    if (!best || Math.abs(deviation) < Math.abs(best.deviation)) best = { label, parts, take, deviation }
  }
  if (!best || Math.abs(best.deviation) > 0.12) return null
  if (best.label === 'the whole recipe' && Math.abs(best.deviation) > 0.03) return null
  return {
    label: best.label,
    parts: best.parts,
    take: best.take,
    qualifier: Math.abs(best.deviation) <= 0.03 ? null : best.deviation > 0 ? 'generous' : 'scant',
  }
}
