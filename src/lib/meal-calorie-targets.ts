export type CalorieTargetSlot = {
  key: string
  percentage: number
}

/**
 * Allocate whole-calorie meal targets from the active meal percentages while
 * guaranteeing the displayed/saved slots add back to the daily target.
 */
export function allocateMealCalorieTargets(
  dailyCalories: number,
  slots: CalorieTargetSlot[],
) {
  const activeSlots = slots.filter((slot) => slot.percentage > 0)
  const targetTotal = Math.round(dailyCalories)
  const percentageTotal = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0)
  if (targetTotal <= 0 || percentageTotal <= 0 || activeSlots.length === 0) {
    return new Map(activeSlots.map((slot) => [slot.key, 0]))
  }

  const quotas = activeSlots.map((slot, index) => {
    const exact = dailyCalories * slot.percentage / percentageTotal
    const floor = Math.floor(exact)
    return {
      ...slot,
      index,
      exact,
      target: floor,
      remainder: exact - floor,
    }
  })

  let remaining = targetTotal - quotas.reduce((sum, slot) => sum + slot.target, 0)
  const byRemainder = [...quotas].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder
    return a.index - b.index
  })

  for (const slot of byRemainder) {
    if (remaining <= 0) break
    slot.target += 1
    remaining -= 1
  }

  return new Map(quotas.map((slot) => [slot.key, slot.target]))
}
