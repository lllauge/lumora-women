export type MacroCalculationInputs = {
  age: string
  height: string
  weight: string
  targetWeight: string
  primaryGoal: string
  planGoal: string
  mealPlanStyle: string
  /** ISO date the meal plan's Day 1 begins; drives the client's two-week release schedule. */
  mealPlanStartDate: string
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

export type MacroCalculationAudit = {
  inputs: {
    age: number
    heightCm: number
    weightLb: number
    weightKg: number
    targetWeightLb: number | null
  }
  factors: {
    lifestyle: number
    exercise: number
    activity: number
    goalAdjustment: number
  }
  equations: Array<{ label: string; formula: string; result: number; unit: string }>
  targets: CalculatedMacroTargets
}

// TDEE model follows the RSN certification template: BMR × (lifestyle + exercise).
// Lifestyle covers daily non-exercise movement (0.6 desk-bound → 0.9 rarely sits);
// exercise covers structured training (0.55 none → 0.85 five-plus days).
const lifestyleFactors: Record<string, number> = {
  mostly_sedentary: 0.6,
  light_daily_movement: 0.7,
  moderate_daily_movement: 0.8,
  very_active_lifestyle: 0.9,
}

const exerciseFactors: Record<string, number> = {
  none: 0.55,
  not_sure: 0.55,
  '1_2_days': 0.65,
  '3_4_days': 0.75,
  '5_plus_days': 0.85,
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

function activityFactorParts(inputs: MacroCalculationInputs) {
  let lifestyle = lifestyleFactors[inputs.activityLevel] ?? lifestyleFactors.light_daily_movement
  const steps = parseStepCount(inputs.steps)
  if (steps && steps >= 10000) lifestyle = Math.max(lifestyle, 0.8)
  else if (steps && steps >= 8000) lifestyle = Math.max(lifestyle, 0.75)
  else if (steps && steps >= 6000) lifestyle = Math.max(lifestyle, 0.7)
  const exercise = exerciseFactors[inputs.strengthTraining] ?? exerciseFactors.none
  return { lifestyle, exercise, activity: lifestyle + exercise }
}

export function calculateMacroAudit(inputs: MacroCalculationInputs): MacroCalculationAudit | null {
  const age = firstNumber(inputs.age)
  const heightCm = parseHeightCentimeters(inputs.height)
  const weightLb = parseWeightPounds(inputs.weight)

  if (!age || !heightCm || !weightLb) return null

  const weightKg = weightLb / 2.20462
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const { lifestyle, exercise, activity } = activityFactorParts(inputs)
  const maintenanceCalories = bmr * activity
  const adjustment = goalCalorieAdjustments[inputs.planGoal] ?? goalCalorieAdjustments.recomposition
  const adjustedCalories = Math.max(1200, maintenanceCalories * (1 + adjustment))
  const calories = roundToNearest(adjustedCalories, 25)
  const targetWeightLb = parseWeightPounds(inputs.targetWeight)
  const proteinReferenceLb = targetWeightLb && targetWeightLb < weightLb ? targetWeightLb : weightLb
  const proteinFloor = (calories * 0.3) / 4
  const proteinCap = (calories * 0.4) / 4
  const protein = roundToNearest(Math.min(Math.max(proteinFloor, proteinReferenceLb), proteinCap), 5)
  const fatBeforeRounding = Math.max(50, (calories * 0.35) / 9)
  const fats = roundToNearest(fatBeforeRounding, 5)
  const carbsBeforeRounding = Math.max(0, (calories - protein * 4 - fats * 9) / 4)
  const carbs = Math.round(carbsBeforeRounding)
  const fiberBeforeBounds = (calories * 14) / 1000
  const fiber = Math.min(38, Math.max(20, Math.round(fiberBeforeBounds)))
  const steps = inputs.steps.trim() || (inputs.activityLevel === 'mostly_sedentary' ? '6,000-8,000/day' : '8,000-10,000/day')
  const targets = {
    calories: `${calories}`,
    protein: `${protein}g`,
    carbs: `${carbs}g`,
    fats: `${fats}g`,
    fiber: `${fiber}g`,
    water: inputs.water.trim() || '80-100 oz/day',
    steps,
    workoutTarget: inferWorkoutTarget(inputs),
  }

  return {
    inputs: { age, heightCm, weightLb, weightKg, targetWeightLb },
    factors: { lifestyle, exercise, activity, goalAdjustment: adjustment },
    equations: [
      { label: 'BMR', formula: `10 x ${weightKg.toFixed(2)}kg + 6.25 x ${heightCm.toFixed(1)}cm - 5 x ${age} - 161`, result: bmr, unit: 'cal' },
      { label: 'Maintenance calories', formula: `${bmr.toFixed(1)} BMR x (${lifestyle} lifestyle + ${exercise} exercise)`, result: maintenanceCalories, unit: 'cal' },
      { label: 'Calorie target', formula: `max(1,200, ${maintenanceCalories.toFixed(1)} x (1 + ${adjustment})) then round to nearest 25`, result: calories, unit: 'cal' },
      { label: 'Protein target', formula: `clamp(${proteinReferenceLb.toFixed(1)}g reference, ${proteinFloor.toFixed(1)}g floor, ${proteinCap.toFixed(1)}g cap) then round to nearest 5`, result: protein, unit: 'g' },
      { label: 'Fat target', formula: `max(50g, ${calories} x 35% / 9) then round to nearest 5`, result: fats, unit: 'g' },
      { label: 'Carb target', formula: `(${calories} - ${protein} x 4 - ${fats} x 9) / 4 then round`, result: carbs, unit: 'g' },
      { label: 'Fiber target', formula: `${calories} x 14 / 1,000, constrained to 20-38g`, result: fiber, unit: 'g' },
    ],
    targets,
  }
}

export function calculateMacroTargets(inputs: MacroCalculationInputs): CalculatedMacroTargets | null {
  return calculateMacroAudit(inputs)?.targets ?? null
}
