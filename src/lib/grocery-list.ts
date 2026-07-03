// Master grocery list, shared by the admin plan editor (save-time rebuild)
// and the client portal (render-time display) so the client's list can never
// go stale against the recipes actually in the meal plan.
// Explicit .ts extensions so this module also loads under `node --test
// --experimental-strip-types`, which resolves relative imports literally.
import { cookedGramsToRaw } from './cooked-to-raw.ts'
import { mealRecipeNames, type CoachingPlanDraft } from './coaching-plan-schema.ts'

/** Strip the leading USDA/curated match tag from a stored ingredient line. */
export function cleanIngredientLine(line: string) {
  return line.replace(/^\[(?:fdc:\d+|curated:[a-z0-9-]+)\]\s*/i, '').trim()
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
  for (const [recipeName, times] of cookCounts) {
    const recipe = plan.recipes.find((r) => r.name === recipeName)
    if (!recipe) continue
    for (const raw of recipe.ingredients) {
      const line = cleanIngredientLine(raw)
      if (!line) continue
      const gramMatch = line.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i)
      if (gramMatch) {
        const cookedGrams = Number(gramMatch[1]) * times
        const { grams, label } = cookedGramsToRaw(gramMatch[2].trim(), cookedGrams)
        const key = label.toLowerCase()
        const existing = gramTotals.get(key)
        gramTotals.set(key, { label, grams: (existing?.grams ?? 0) + grams })
      } else {
        const key = line.toLowerCase()
        const existing = otherCounts.get(key)
        otherCounts.set(key, { label: line, count: (existing?.count ?? 0) + times })
      }
    }
  }

  return [
    ...[...gramTotals.values()].map(({ label, grams }) => `${Math.round(grams)}g ${label}`),
    ...[...otherCounts.values()].map(({ label, count }) => (count > 1 ? `${label} (×${count})` : label)),
  ]
}

// Rebuilt grocery lines lead with a gram weight or end with a cook-count
// marker; anything else in the saved list is a staple the coach typed herself
// ("paper towels") and survives the rebuild — unless the rebuilt list already
// covers that ingredient under a machine-formatted line.
export function mergeGroceryList(current: string[], generated: string[]): string[] {
  const labelOf = (line: string) => line
    .toLowerCase()
    .replace(/^\d+(?:\.\d+)?\s*g\b\s*/i, '')
    .replace(/\s*\(×\d+\)\s*$/, '')
    .replace(/,\s*raw\s*$/, '')
    .trim()
  const generatedLabels = generated.map(labelOf)
  const machineOwned = (line: string) =>
    /^\d+(?:\.\d+)?\s*g\b/i.test(line.trim()) || /\(×\d+\)\s*$/.test(line.trim())
  const extras = current.filter((line) => {
    if (machineOwned(line)) return false
    const label = labelOf(line)
    if (!label) return false
    return !generatedLabels.some((g) => g.includes(label) || label.includes(g))
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
