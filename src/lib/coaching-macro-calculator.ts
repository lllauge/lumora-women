export type MacroCalculationInputs = {
  age: string
  height: string
  weight: string
  targetWeight: string
  primaryGoal: string
  activityLevel: string
  calorieAdjustment: string
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

const calorieAdjustments: Record<string, number> = {
  conservative_loss: -0.12,
  steady_loss: -0.18,
  aggressive_loss: -0.25,
  maintenance: 0,
  reverse: 0.08,
}

function firstNumber(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

export function parseWeightPounds(value: string) {
  const normalized = value.toLowerCase()
  const amount = firstNumber(normalized)
  if (!amount) return null
  return normalized.includes('kg') ? amount * 2.20462 : amount
}

export function parseHeightCentimeters(value: string) {
  const normalized = value.toLowerCase().trim()
  if (!normalized) return null

  const feetInches = normalized.match(/(\d+)\s*(?:'|ft|feet)\s*(\d+)?/)
  if (feetInches) {
    const feet = Number(feetInches[1])
    const inches = Number(feetInches[2] ?? 0)
    return (feet * 12 + inches) * 2.54
  }

  const inchesOnly = normalized.match(/(\d+(\.\d+)?)\s*(?:in|inches)/)
  if (inchesOnly) return Number(inchesOnly[1]) * 2.54

  const amount = firstNumber(normalized)
  if (!amount) return null
  return normalized.includes('cm') || amount > 90 ? amount : amount * 2.54
}

function roundToNearest(value: number, nearest = 5) {
  return Math.round(value / nearest) * nearest
}

function inferWorkoutTarget(inputs: MacroCalculationInputs) {
  if (inputs.strengthTrainingDetails.trim()) return inputs.strengthTrainingDetails.trim()
  if (inputs.workouts.trim()) return inputs.workouts.trim()

  if (inputs.strengthTraining === 'none') return 'Start with 2 beginner strength sessions per week'
  if (inputs.strengthTraining === '1_2_days') return '2 strength sessions per week'
  if (inputs.strengthTraining === '3_4_days') return '3-4 strength sessions per week'
  if (inputs.strengthTraining === '5_plus_days') return '4-5 strength sessions per week with recovery built in'

  return '2-3 strength sessions per week'
}

export function calculateMacroTargets(inputs: MacroCalculationInputs): CalculatedMacroTargets | null {
  const age = firstNumber(inputs.age)
  const heightCm = parseHeightCentimeters(inputs.height)
  const weightLb = parseWeightPounds(inputs.weight)

  if (!age || !heightCm || !weightLb) return null

  const weightKg = weightLb / 2.20462
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const activity = activityMultipliers[inputs.activityLevel] ?? activityMultipliers.light_daily_movement
  const maintenanceCalories = bmr * activity
  const adjustment = calorieAdjustments[inputs.calorieAdjustment] ?? calorieAdjustments.steady_loss
  const calories = roundToNearest(Math.max(1200, maintenanceCalories * (1 + adjustment)), 25)

  const protein = roundToNearest(weightLb, 5)
  const fats = roundToNearest(Math.max(45, (calories * 0.28) / 9), 5)
  const carbs = roundToNearest(Math.max(80, (calories - protein * 4 - fats * 9) / 4), 5)
  const fiber = Math.max(35, Math.round(calories / 100))
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
