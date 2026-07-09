// Master grocery list, shared by the admin plan editor (save-time rebuild)
// and the client portal (render-time display) so the client's list can never
// go stale against the recipes actually in the meal plan.
// Explicit .ts extensions so this module also loads under `node --test
// --experimental-strip-types`, which resolves relative imports literally.
import { cookedGramsToRaw } from './cooked-to-raw.ts'
import { typedMeasureToGrams } from './household-measure.ts'
import { mealRecipeNames, type CoachingPlanDraft } from './coaching-plan-schema.ts'

/** Strip the leading USDA/curated match tag from a stored ingredient line. */
export function cleanIngredientLine(line: string) {
  return line.replace(/^\[(?:fdc:\d+|curated:[a-z0-9-]+)\]\s*/i, '').trim()
}

// Descriptors that never distinguish one grocery item from another.
const NOISE_TOKENS = new Set(['raw', 'uncooked', 'of', 'a', 'the'])

// One food, one line: each rule collapses every phrasing of the same shelf
// item ("Oil, olive, extra virgin" / "Olive oil" / "extra virgin olive oil")
// into one canonical entry. `within` rules match when every token is drawn
// from the allowed set; `contains` rules match when the required tokens are
// present. Order matters — first hit wins.
const ALIAS_RULES: Array<
  | { within: string[]; require: string; label: string }
  | { contains: string[]; label: string }
> = [
  { within: ['pepper', 'black', 'ground'], require: 'pepper', label: 'black pepper' },
  { within: ['salt', 'sea', 'fine', 'table', 'iodized'], require: 'salt', label: 'salt' },
  { within: ['egg', 'whole', 'large', 'medium', 'small'], require: 'egg', label: 'eggs' },
  { within: ['garlic', 'clove'], require: 'garlic', label: 'garlic' },
  { contains: ['olive', 'oil'], label: 'olive oil' },
]

/**
 * Identity of a grocery item for merging: brands and serving parentheticals
 * dropped, USDA comma order neutralized by sorting tokens, plurals folded,
 * and common same-food phrasings aliased. "Egg, whole, raw (8 large)" and
 * "10 large eggs" both key to "eggs".
 */
export function canonicalGroceryKey(label: string): string {
  const tokens = label
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\s,/]+/)
    .map((token) => token.replace(/[^a-z%0-9-]/g, ''))
    .map((token) => {
      if (token.length <= 3 || token.endsWith('ss')) return token
      if (token.endsWith('ies')) return `${token.slice(0, -3)}y`
      if (token.endsWith('oes')) return token.slice(0, -2)
      return token.endsWith('s') ? token.slice(0, -1) : token
    })
    .filter((token) => token && !NOISE_TOKENS.has(token))
  const set = new Set(tokens)
  for (const rule of ALIAS_RULES) {
    if ('contains' in rule) {
      if (rule.contains.every((token) => set.has(token))) return rule.label
    } else if (set.has(rule.require) && tokens.every((token) => rule.within.includes(token))) {
      return rule.label
    }
  }
  return [...set].sort().join(' ')
}

// Aliased groups get a fixed clean name; everything else shows its shortest
// original phrasing with serving-size parentheticals ("(6 fl oz)", "(1 scoop)")
// removed — brand parentheticals stay, they help at the store.
const ALIAS_DISPLAY = new Map(
  ALIAS_RULES.map((rule) => [rule.label, rule.label]),
)

function displayLabel(label: string): string {
  return label
    .replace(/\(\s*\d[^)]*\)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*$/, '')
    .trim()
}

// "(not consumed)" is a nutrition-exclusion marker (brine water, discarded
// marinade) — the food still gets bought and used, so it stays on the list
// without the internal marker. Plain water is the one exception: nobody puts
// tap water on a shopping list.
function shoppableLabel(label: string): string | null {
  const cleaned = label.replace(/\s*\(not consumed\)\s*$/i, '').trim()
  if (/^water\b(?!melon)/i.test(cleaned)) return null
  return cleaned
}

// Every meal-slot usage of a recipe means the full dish gets cooked once,
// so the grocery list aggregates full-recipe ingredients per usage.
export function buildGroceryList(plan: CoachingPlanDraft): string[] {
  const cookCounts = new Map<string, number>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      for (const name of mealRecipeNames(meal)) {
        cookCounts.set(name, (cookCounts.get(name) ?? 0) + 1)
      }
    }
  }

  const gramTotals = new Map<string, { label: string; grams: number }>()
  const otherCounts = new Map<string, { label: string; count: number }>()

  const addGrams = (key: string, label: string, grams: number) => {
    const existing = gramTotals.get(key)
    const display = ALIAS_DISPLAY.get(key) ?? displayLabel(label)
    // Keep the shortest phrasing seen — it's almost always the cleanest.
    const best = existing && existing.label.length <= display.length ? existing.label : display
    gramTotals.set(key, { label: best, grams: (existing?.grams ?? 0) + grams })
  }

  for (const [recipeName, times] of cookCounts) {
    const recipe = plan.recipes.find((r) => r.name === recipeName)
    if (!recipe) continue
    for (const raw of recipe.ingredients) {
      const line = cleanIngredientLine(raw)
      if (!line) continue
      const gramMatch = line.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i)
      if (gramMatch) {
        const shoppable = shoppableLabel(gramMatch[2].trim())
        if (!shoppable) continue
        const cookedGrams = Number(gramMatch[1]) * times
        const { grams, label } = cookedGramsToRaw(shoppable, cookedGrams)
        addGrams(canonicalGroceryKey(label), label, grams)
        continue
      }
      const shoppable = shoppableLabel(line)
      if (!shoppable) continue
      // Typed household amounts ("2 tbsp salt", "12 cloves garlic") convert
      // to grams so they merge with USDA gram lines for the same food.
      const typed = typedMeasureToGrams(shoppable)
      if (typed) {
        addGrams(canonicalGroceryKey(typed.label), typed.label, typed.grams * times)
        continue
      }
      const key = canonicalGroceryKey(shoppable)
      const existing = otherCounts.get(key)
      const display = displayLabel(shoppable)
      const best = existing && existing.label.length <= display.length ? existing.label : display
      otherCounts.set(key, { label: best, count: (existing?.count ?? 0) + times })
    }
  }

  // Alphabetical by food name so same-aisle items ("green bell pepper",
  // "red bell pepper") sit next to each other.
  return [
    ...[...gramTotals.values()].map(({ label, grams }) => ({ label, line: `${Math.round(grams)}g ${label}` })),
    ...[...otherCounts.values()].map(({ label, count }) => ({ label, line: count > 1 ? `${label} (×${count})` : label })),
  ]
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))
    .map(({ line }) => line)
}

// Rebuilt grocery lines lead with a gram weight or end with a cook-count
// marker; anything else in the saved list is a staple the coach typed herself
// ("paper towels") and survives the rebuild — unless the rebuilt list already
// covers that ingredient under a machine-formatted line.
export function mergeGroceryList(current: string[], generated: string[]): string[] {
  const keyOf = (line: string) => canonicalGroceryKey(
    line
      .replace(/^\d+(?:\.\d+)?\s*g\b\s*/i, '')
      .replace(/\s*\(×\d+\)\s*$/, ''),
  )
  const generatedKeys = generated.map(keyOf)
  const machineOwned = (line: string) =>
    /^\d+(?:\.\d+)?\s*g\b/i.test(line.trim()) || /\(×\d+\)\s*$/.test(line.trim())
  const extras = current.filter((line) => {
    if (machineOwned(line)) return false
    const key = keyOf(line)
    if (!key) return false
    return !generatedKeys.some((g) => g === key || g.includes(key) || key.includes(g))
  })
  return [...generated, ...extras]
}

/**
 * The list the client should actually see: always derived fresh from the
 * meal plan's recipes, with the coach's hand-typed staples appended. Falls
 * back to the stored list when the plan has no recipe-backed meals.
 */
export function clientGroceryList(plan: CoachingPlanDraft): string[] {
  const generated = buildGroceryList(plan)
  return generated.length > 0 ? mergeGroceryList(plan.groceryList, generated) : plan.groceryList
}
