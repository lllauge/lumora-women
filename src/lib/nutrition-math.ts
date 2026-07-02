export function atwaterGeneralCalories(protein: number, carbs: number, fats: number) {
  return protein * 4 + carbs * 4 + fats * 9
}

export function shouldReviewEnergyDifference(
  databaseCalories: number,
  macroCalories: number,
  relativeThreshold = 0.15,
  minimumCalorieDifference = 25,
) {
  if (!Number.isFinite(databaseCalories) || databaseCalories <= 0) return false
  if (!Number.isFinite(macroCalories)) return false
  const calorieDifference = Math.abs(databaseCalories - macroCalories)
  return calorieDifference / databaseCalories > relativeThreshold
    && calorieDifference >= minimumCalorieDifference
}

/**
 * FoodData Central's reported energy is authoritative when present. The
 * general Atwater equation is only a fallback for records whose energy field
 * is missing while macros are available.
 */
export function resolvedFoodCalories({
  reportedCalories,
  protein,
  carbs,
  fats,
}: {
  reportedCalories: number
  protein: number
  carbs: number
  fats: number
}) {
  if (reportedCalories > 0) return reportedCalories
  return atwaterGeneralCalories(protein, carbs, fats)
}

/** One serving from a family recipe; the whole recipe for an individual dish. */
export function declaredServingMultiplier(familyServings: number, isFamily: boolean) {
  return isFamily && familyServings > 1 ? 1 / familyServings : 1
}

/**
 * Keep a deliberately fitted client portion through preview and persistence.
 * Invalid or legacy blank values fall back to one declared recipe serving.
 *
 * Family recipes additionally require a carved share (0 < m < 1): a stored
 * multiplier of 1 or more would price the whole family pot as one client
 * serving, which the portion fitter never produces — it appears only when a
 * plan drafted in individual style is switched to family style, and must fall
 * back to an equal declared share like the client portal does.
 */
export function resolvedServingMultiplier(
  storedMultiplier: string | undefined,
  familyServings: number,
  isFamily: boolean,
) {
  const stored = Number.parseFloat(String(storedMultiplier ?? '').trim())
  const validStored = Number.isFinite(stored) && stored > 0 && stored <= 4
    && (!isFamily || stored < 1)
  return validStored
    ? stored
    : declaredServingMultiplier(familyServings, isFamily)
}

export function scaleFullRecipeNutrition({
  calories,
  protein,
  carbs,
  fats,
  fiber,
  multiplier,
}: {
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  multiplier: number
}) {
  const round1 = (value: number) => Math.round(value * 10) / 10
  return {
    calories: Math.round(calories * multiplier),
    protein: round1(protein * multiplier),
    carbs: round1(carbs * multiplier),
    fats: round1(fats * multiplier),
    fiber: round1(fiber * multiplier),
  }
}
