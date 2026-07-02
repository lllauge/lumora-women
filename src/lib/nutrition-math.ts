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
 */
export function resolvedServingMultiplier(
  storedMultiplier: string | undefined,
  familyServings: number,
  isFamily: boolean,
) {
  const stored = Number.parseFloat(String(storedMultiplier ?? '').trim())
  return Number.isFinite(stored) && stored > 0 && stored <= 4
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
