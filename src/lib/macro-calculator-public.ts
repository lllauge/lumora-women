import {
  calculateMacroTargets,
  type MacroCalculationInputs,
} from '@/lib/coaching-macro-calculator'

/**
 * Public macro calculator (lead magnet at /macro-calculator).
 *
 * Thin mapping layer over the same engine used for paid coaching clients
 * (coaching-macro-calculator.ts) so the free tool and the coaching plans
 * never drift apart. All numbers are computed server side.
 */

export const DAILY_MOVEMENT_OPTIONS = [
  'mostly_sedentary',
  'light_daily_movement',
  'moderate_daily_movement',
  'very_active_lifestyle',
] as const

export const STEP_RANGE_OPTIONS = [
  'under_5k',
  '5k_to_7_5k',
  '7_5k_to_10k',
  '10k_to_12_5k',
  'over_12_5k',
] as const

export const STRENGTH_OPTIONS = ['none', '1_2_days', '3_4_days', '5_plus_days'] as const

export const GOAL_OPTIONS = ['fat_loss', 'recomposition', 'build_muscle'] as const

export const LIFE_STAGE_OPTIONS = [
  'cycling',
  'birth_control',
  'trying_to_conceive',
  'postpartum',
  'breastfeeding',
  'perimenopause',
  'menopause',
  'prefer_not_to_say',
] as const

export const DIETING_HISTORY_OPTIONS = ['not_really', 'on_and_off', 'long_time'] as const

export const STRESS_OPTIONS = ['manageable', 'coping', 'constantly_high'] as const

export type PublicMacroInputs = {
  age: string
  heightFeet: string
  heightInches: string
  weightLb: string
  goalWeightLb: string
  dailyMovement: (typeof DAILY_MOVEMENT_OPTIONS)[number]
  stepRange: (typeof STEP_RANGE_OPTIONS)[number]
  strengthDays: (typeof STRENGTH_OPTIONS)[number]
  sleepHours: string
  goal: (typeof GOAL_OPTIONS)[number]
  lifeStage: (typeof LIFE_STAGE_OPTIONS)[number]
  dietingHistory: (typeof DIETING_HISTORY_OPTIONS)[number]
  stress: (typeof STRESS_OPTIONS)[number]
}

export type MacroInsight = {
  title: string
  body: string
}

export type PublicMacroResult = {
  maintenanceCalories: number
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  water: string
  steps: string
  /** Goal actually applied after safety overrides (breastfeeding). */
  goalApplied: string
  proteinAnchoredToGoalWeight: boolean
  insights: MacroInsight[]
}

// Midpoints of the public step ranges, fed to the engine's lifestyle floor.
const stepRangeMidpoints: Record<PublicMacroInputs['stepRange'], string> = {
  under_5k: '4000',
  '5k_to_7_5k': '6000',
  '7_5k_to_10k': '8500',
  '10k_to_12_5k': '11000',
  over_12_5k: '13000',
}

// Presented as the daily step target. Low movers get the same gentle nudge
// the coaching engine defaults to; everyone else keeps their current range.
const stepRangeLabels: Record<PublicMacroInputs['stepRange'], string> = {
  under_5k: '6,000 to 8,000',
  '5k_to_7_5k': '5,000 to 7,500',
  '7_5k_to_10k': '7,500 to 10,000',
  '10k_to_12_5k': '10,000 to 12,500',
  over_12_5k: '12,500 or more',
}

const goalLabels: Record<string, string> = {
  fat_loss: 'fat loss',
  recomposition: 'recomposition',
  build_muscle: 'muscle building',
  maintenance: 'maintenance',
}

function emptyEngineInputs(): MacroCalculationInputs {
  return {
    age: '',
    height: '',
    weight: '',
    targetWeight: '',
    primaryGoal: '',
    planGoal: '',
    mealPlanStyle: '',
    mealPlanStartDate: '',
    activityLevel: '',
    steps: '',
    strengthTraining: '',
    strengthTrainingDetails: '',
    workouts: '',
    water: '',
    medicalConditions: '',
    medications: '',
    injuries: '',
    currentEating: '',
    allergies: '',
    restrictions: '',
    favoriteFoods: '',
    dislikedFoods: '',
    eatingOut: '',
    sleep: '',
    stress: '',
    breakfastPct: '',
    lunchPct: '',
    dinnerPct: '',
    snackPct: '',
  }
}

function toEngineInputs(inputs: PublicMacroInputs, planGoal: string): MacroCalculationInputs {
  const feet = Number(inputs.heightFeet) || 0
  const inches = Number(inputs.heightInches) || 0

  return {
    ...emptyEngineInputs(),
    age: inputs.age,
    height: `${feet}'${inches}"`,
    weight: inputs.weightLb,
    targetWeight: inputs.goalWeightLb,
    planGoal,
    activityLevel: inputs.dailyMovement,
    steps: stepRangeMidpoints[inputs.stepRange] ?? '',
    strengthTraining: inputs.strengthDays,
    sleep: inputs.sleepHours,
  }
}

/**
 * Breastfeeding softens fat loss to the gentler recomposition deficit so milk
 * supply is protected.
 */
function applyGoalSafety(inputs: PublicMacroInputs): string {
  if (inputs.lifeStage === 'breastfeeding' && inputs.goal === 'fat_loss') return 'recomposition'
  return inputs.goal
}

function buildInsights(inputs: PublicMacroInputs, goalApplied: string): MacroInsight[] {
  const insights: MacroInsight[] = []

  if (inputs.lifeStage === 'breastfeeding') {
    insights.push({
      title: 'We kept your deficit gentle to protect your supply',
      body: goalApplied === 'recomposition' && inputs.goal === 'fat_loss'
        ? 'Because you are breastfeeding, we softened your deficit from 12 percent to 5 percent below maintenance. A hard cut is the fastest way to hurt your milk supply. Watch your supply closely, and if it dips, eat more and give it a few days before you judge anything. Protein and water matter double right now. One honest note: our one on one coaching does not take breastfeeding clients, this season belongs to you and your baby. These numbers are here to educate you, and when you are done breastfeeding we would love to meet you.'
        : 'Milk production burns real energy every single day, so treat these numbers as a floor, not a ceiling. If your supply dips, eat more and give it a few days before you judge anything. Protein and water matter double right now. One honest note: our one on one coaching does not take breastfeeding clients, this season belongs to you and your baby. These numbers are here to educate you, and when you are done breastfeeding we would love to meet you.',
    })
  } else if (inputs.lifeStage === 'postpartum') {
    insights.push({
      title: 'Postpartum changes the starting point',
      body: 'Your body is still rebuilding, and that recovery is part of the math. Hit your protein first, keep the deficit modest, and let consistency do the heavy lifting.',
    })
  } else if (inputs.lifeStage === 'perimenopause' || inputs.lifeStage === 'menopause') {
    insights.push({
      title: 'Protein matters more in this season',
      body: 'As estrogen shifts, holding onto muscle gets harder and matters more. Treat your protein target as the non negotiable number and build each meal around it.',
    })
  }

  if (inputs.dietingHistory === 'long_time') {
    insights.push({
      title: 'Your history of dieting is part of the picture',
      body: 'Months of eating low can pull your real maintenance below what any formula predicts. Treat these numbers as a starting point, eat consistently for 2 to 3 weeks, and let your actual results tell us if they need to move. That is exactly how we adjust inside coaching.',
    })
  } else if (inputs.dietingHistory === 'on_and_off') {
    insights.push({
      title: 'Consistency will beat perfection',
      body: 'On and off dieting keeps your body guessing and your progress stalling. Two to three steady weeks at these numbers will tell you more than any restart ever has.',
    })
  }

  if (inputs.stress === 'constantly_high') {
    insights.push({
      title: 'Stress is a real variable, not an excuse',
      body: 'Constant stress raises cortisol, disrupts sleep, and drives cravings. We did not shrink your calories because of it. Under eating on top of high stress usually backfires. Walks, protein, and sleep move the needle more than a harsher deficit.',
    })
  }

  const sleep = Number(inputs.sleepHours)
  if (sleep && sleep < 7) {
    insights.push({
      title: 'Sleep is quietly working against you',
      body: 'Under 7 hours a night raises hunger hormones and makes fat loss harder at any calorie level. Even 30 more minutes is a real lever. It costs nothing and pays back every day.',
    })
  }

  if (goalApplied === 'build_muscle') {
    insights.push({
      title: 'Building takes patience and food',
      body: 'You are in a small surplus on purpose. The scale is supposed to move up slowly. Judge this phase by your strength numbers and how your clothes fit, not by day to day weight.',
    })
  }

  return insights
}

export function calculatePublicMacros(inputs: PublicMacroInputs): PublicMacroResult | null {
  const goalApplied = applyGoalSafety(inputs)

  const goalTargets = calculateMacroTargets(toEngineInputs(inputs, goalApplied))
  const maintenanceTargets = calculateMacroTargets(toEngineInputs(inputs, 'maintenance'))
  if (!goalTargets || !maintenanceTargets) return null

  const goalWeight = Number(inputs.goalWeightLb)
  const currentWeight = Number(inputs.weightLb)
  const softenedForSupply = goalApplied === 'recomposition' && inputs.goal === 'fat_loss'

  return {
    maintenanceCalories: Number(maintenanceTargets.calories),
    calories: Number(goalTargets.calories),
    proteinG: parseInt(goalTargets.protein, 10),
    carbsG: parseInt(goalTargets.carbs, 10),
    fatG: parseInt(goalTargets.fats, 10),
    fiberG: parseInt(goalTargets.fiber, 10),
    water: goalTargets.water,
    steps: stepRangeLabels[inputs.stepRange] ?? goalTargets.steps,
    goalApplied: softenedForSupply ? 'gentle fat loss' : (goalLabels[goalApplied] ?? goalApplied),
    proteinAnchoredToGoalWeight: Boolean(goalWeight && currentWeight && goalWeight < currentWeight),
    insights: buildInsights(inputs, goalApplied),
  }
}
