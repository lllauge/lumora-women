export type MacroCalculationInputs = {
  age: string
  height: string
  weight: string
  targetWeight: string
  primaryGoal: string
  planGoal: string
  mealPlanStyle: string
  activityLevel: string
  steps: string
  strengthTraining: string
  strengthTrainingDetails: string
  workouts: string
  water: string
  medicalConditions: string
  medications: string
  injuries: string
  currentEating: string
  allergies: string
  restrictions: string
  favoriteFoods: string
  dislikedFoods: string
  eatingOut: string
  sleep: string
  stress: string
  breakfastPct: string
  lunchPct: string
  dinnerPct: string
  snackPct: string
}

export type CalculatedMacroTargets = {
  calories: string
  protein: string
  carbs: string
  fats: string
  fiber: string
  water: string
  steps: string
  workoutTarget: string
}

const activityMultipliers: Record<string, number> = {
  mostly_sedentary: 1.2,
  light_daily_movement: 1.3,
  moderate_daily_movement: 1.45,
  very_active_lifestyle: 1.6,
}

const goalCalorieAdjustments: Record<string, number> = {
  fat_loss: -0.12,
  recomposition: -0.05,
  build_muscle: 0.08,
  maintenance: 0,
  performance: 0.1,
}

function firstNumber(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function parseStepCount(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, '')
  const amount = firstNumber(normalized)
  if (!amount) return null
  return normalized.includes('k') ? amount * 1000 : amount
}

export function parseWeightPounds(value: string) {
  const normalized = value.toLowerCase()
  const amount = firstNumber(normalized)
  if (!amount) return null
  return normalized.includes('kg') ? amount * 2.20462 : amount
}

export function parseHeightCentimeters(value: string) {
  // Normalize curly quotes/primes to straight ASCII so 5'2" and 5'2" both parse.
  const normalized = value
    .toLowerCase()
    .replace(/[‘’ʼʹ′]/g, "'")
    .replace(/[“”ʺ″]/g, '"')
    .trim()
  if (!normalized) return null

  const feetInches = normalized.match(/(\d+)\s*(?:'|ft|feet)\s*(\d+(?:\.\d+)?)?\s*(?:"|in|inches)?/)
  if (feetInches) {
    const feet = Number(feetInches[1])
    const inches = Number(feetInches[2] ?? 0)
    return (feet * 12 + inches) * 2.54
  }

  const inchesOnly = normalized.match(/(\d+(\.\d+)?)\s*(?:"|in|inches)/)
  if (inchesOnly) return Number(inchesOnly[1]) * 2.54

  const amount = firstNumber(normalized)
  if (!amount) return null
  return normalized.includes('cm') || amount > 90 ? amount : amount * 2.54
}

function roundToNearest(value: number, nearest = 5) {
  return Math.round(value / nearest) * nearest
}

function inferWorkoutTarget(inputs: MacroCalculationInputs) {
  if (inputs.strengthTraining === 'none') return 'Start with 2 beginner strength sessions per week'
  if (inputs.strengthTraining === '1_2_days') return '2 strength sessions per week'
  if (inputs.strengthTraining === '3_4_days') return '3-4 strength sessions per week'
  if (inputs.strengthTraining === '5_plus_days') return '4-5 strength sessions per week with recovery built in'
  if (inputs.workouts.trim()) return inputs.workouts.trim()

  return '2-3 strength sessions per week'
}

function inferActivityMultiplier(inputs: MacroCalculationInputs) {
  let multiplier = activityMultipliers[inputs.activityLevel] ?? activityMultipliers.light_daily_movement
  const steps = parseStepCount(inputs.steps)

  if (steps && steps >= 10000) multiplier = Math.max(multiplier, 1.5)
  else if (steps && steps >= 8000) multiplier = Math.max(multiplier, 1.42)
  else if (steps && steps >= 6000) multiplier = Math.max(multiplier, 1.35)

  if (inputs.strengthTraining === '1_2_days') multiplier = Math.max(multiplier, 1.35)
  if (inputs.strengthTraining === '3_4_days') multiplier = Math.max(multiplier, 1.45)
  if (inputs.strengthTraining === '5_plus_days') multiplier = Math.max(multiplier, 1.55)

  return multiplier
}

export function calculateMacroTargets(inputs: MacroCalculationInputs): CalculatedMacroTargets | null {
  const age = firstNumber(inputs.age)
  const heightCm = parseHeightCentimeters(inputs.height)
  const weightLb = parseWeightPounds(inputs.weight)

  if (!age || !heightCm || !weightLb) return null

  const weightKg = weightLb / 2.20462
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const activity = inferActivityMultiplier(inputs)
  const maintenanceCalories = bmr * activity
  const adjustment = goalCalorieAdjustments[inputs.planGoal] ?? goalCalorieAdjustments.recomposition
  const calories = roundToNearest(Math.max(1200, maintenanceCalories * (1 + adjustment)), 25)

  // Protein: 1g per lb of goal weight (or current weight if no lower goal),
  // bounded so protein stays between 60g and 40% of calories.
  const targetWeightLb = parseWeightPounds(inputs.targetWeight)
  const proteinReferenceLb = targetWeightLb && targetWeightLb < weightLb ? targetWeightLb : weightLb
  const proteinCap = (calories * 0.4) / 4
  const protein = roundToNearest(Math.min(Math.max(60, proteinReferenceLb), proteinCap), 5)

  // Fat: 28% of calories, never below 40g.
  const fats = roundToNearest(Math.max(40, (calories * 0.28) / 9), 5)

  // Carbs are the exact remainder so 4·protein + 4·carbs + 9·fat = calories.
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4))

  // ~14g fiber per 1,000 calories (Dietary Guidelines), kept in a practical range.
  const fiber = Math.min(38, Math.max(20, Math.round((calories * 14) / 1000)))
  const steps = inputs.steps.trim() || (inputs.activityLevel === 'mostly_sedentary' ? '6,000-8,000/day' : '8,000-10,000/day')

  return {
    calories: `${calories}`,
    protein: `${protein}g`,
    carbs: `${carbs}g`,
    fats: `${fats}g`,
    fiber: `${fiber}g`,
    water: inputs.water.trim() || '80-100 oz/day',
    steps,
    workoutTarget: inferWorkoutTarget(inputs),
  }
}
