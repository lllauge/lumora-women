export function atwaterGeneralCalories(protein: number, carbs: number, fats: number) {
  return protein * 4 + carbs * 4 + fats * 9
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
