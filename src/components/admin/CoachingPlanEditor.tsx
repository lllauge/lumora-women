'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, Sparkles, Trash2 } from 'lucide-react'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import { emptyCoachingPlan } from '@/lib/coaching-plan-schema'
import IngredientPicker from './IngredientPicker'
import {
  calculateMacroTargets,
  type MacroCalculationInputs,
} from '@/lib/coaching-macro-calculator'
import {
  generateWorkoutPlan,
  parseDaysPerWeek,
  type LibraryExercise,
} from '@/lib/workout-generator'
import { cookedGramsToRaw } from '@/lib/cooked-to-raw'

type UsdaNutritionResponse = {
  error?: string
  nutrition?: {
    clientServingMultiplier: number
    clientServingGrams: number
    clientServingMeasure: string
    clientServingBreakdown: string
    clientServing: {
      calories: number
      protein: number
      carbs: number
      fats: number
    }
    totalRecipe: {
      calories: number
      protein: number
      carbs: number
      fats: number
    }
    ingredients: Array<{
      input: string
      matchedFood: string
      grams: number
      calories: number
      protein: number
      carbs: number
      fats: number
    }>
    warnings: string[]
  }
}

type LibraryRecipe = {
  id: string
  name: string
  meal_type: string
  family_servings: string
  ingredients: string[]
  instructions: string[]
  notes: string
}

type Props = {
  clientId: string
  initialPlan: CoachingPlanDraft | null
  onboardingData: Record<string, unknown>
  initialPlanningInputs: Record<string, unknown>
  canGenerateAi: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stringField(section: Record<string, unknown>, key: string) {
  const value = section[key]
  return value === null || value === undefined ? '' : String(value)
}

function buildPlanningInputs(onboardingData: Record<string, unknown>): MacroCalculationInputs {
  const body = asRecord(onboardingData.body)
  const goals = asRecord(onboardingData.goals)
  const health = asRecord(onboardingData.health)
  const nutrition = asRecord(onboardingData.nutrition)
  const lifestyle = asRecord(onboardingData.lifestyle)

  return {
    age: stringField(body, 'age'),
    height: stringField(body, 'height'),
    weight: stringField(body, 'weight'),
    targetWeight: stringField(goals, 'targetWeight'),
    primaryGoal: stringField(goals, 'primaryGoal'),
    planGoal: 'recomposition',
    mealPlanStyle: 'family_dinners',
    activityLevel: 'light_daily_movement',
    steps: stringField(lifestyle, 'steps'),
    strengthTraining: stringField(lifestyle, 'strengthTraining') || 'not_sure',
    strengthTrainingDetails: '',
    workouts: stringField(lifestyle, 'workouts'),
    water: stringField(nutrition, 'water'),
    medicalConditions: stringField(health, 'medicalConditions'),
    medications: stringField(health, 'medications'),
    injuries: stringField(health, 'injuries'),
    currentEating: stringField(nutrition, 'currentEating'),
    allergies: stringField(nutrition, 'allergies'),
    restrictions: stringField(nutrition, 'restrictions'),
    favoriteFoods: stringField(nutrition, 'favoriteFoods'),
    dislikedFoods: stringField(nutrition, 'dislikedFoods'),
    eatingOut: stringField(nutrition, 'eatingOut'),
    sleep: stringField(health, 'sleep'),
    stress: stringField(health, 'stress'),
    breakfastPct: '35',
    lunchPct: '30',
    dinnerPct: '25',
    snackPct: '10',
  }
}

function mergePlanningInputs(onboardingData: Record<string, unknown>, savedInputs: Record<string, unknown>): MacroCalculationInputs {
  const defaults = buildPlanningInputs(onboardingData)
  const merged = { ...defaults }

  for (const key of Object.keys(defaults) as Array<keyof MacroCalculationInputs>) {
    const value = savedInputs[key]
    if (value !== null && value !== undefined) {
      merged[key] = String(value)
    }
  }

  return merged
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinLines(value: string[]) {
  return value.join('\n')
}

function firstNumber(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function mealCalorieTarget(mealType: string, dailyCalories: number, inputs: MacroCalculationInputs) {
  const type = mealType.toLowerCase()
  const bPct = (firstNumber(inputs.breakfastPct) || 35) / 100
  const lPct = (firstNumber(inputs.lunchPct) || 30) / 100
  const dPct = (firstNumber(inputs.dinnerPct) || 25) / 100
  const sPct = (firstNumber(inputs.snackPct) || 10) / 100
  if (type.includes('breakfast')) return dailyCalories * bPct
  if (type.includes('lunch')) return dailyCalories * lPct
  if (type.includes('dinner')) return dailyCalories * dPct
  if (type.includes('snack')) return dailyCalories * sPct
  return dailyCalories * lPct
}

function macroPart(value: string, label: string) {
  if (!value.trim()) return ''
  return value.toLowerCase().includes(label) ? value : `${value} ${label}`
}

function caloriePart(value: string) {
  if (!value.trim()) return ''
  const lower = value.toLowerCase()
  return lower.includes('cal') || lower.includes('kcal') ? value : `${value} cal`
}

function recipeMacroLabel(recipe: CoachingPlanDraft['recipes'][number]) {
  return [
    caloriePart(recipe.calories),
    macroPart(recipe.protein, 'protein'),
    macroPart(recipe.carbs, 'carbs'),
    macroPart(recipe.fats, 'fats'),
  ].filter(Boolean).join(', ')
}

function parseMealMacroLine(value: string) {
  const lower = value.toLowerCase()
  const numbers = value.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  const labeled = {
    calories: Number(lower.match(/(\d+(\.\d+)?)\s*(?:cal|calorie|kcal)/)?.[1] ?? 0),
    protein: Number(lower.match(/(\d+(\.\d+)?)\s*g?\s*(?:protein|p\b)/)?.[1] ?? 0),
    carbs: Number(lower.match(/(\d+(\.\d+)?)\s*g?\s*(?:carb|carbs|c\b)/)?.[1] ?? 0),
    fats: Number(lower.match(/(\d+(\.\d+)?)\s*g?\s*(?:fat|fats|f\b)/)?.[1] ?? 0),
  }

  return {
    calories: labeled.calories || numbers[0] || 0,
    protein: labeled.protein || numbers[1] || 0,
    carbs: labeled.carbs || numbers[2] || 0,
    fats: labeled.fats || numbers[3] || 0,
  }
}

function cleanIngredientLine(line: string) {
  return line.replace(/^\[fdc:\d+\]\s*/, '').trim()
}

// Every meal-slot usage of a recipe means the full dish gets cooked once,
// so the grocery list aggregates full-recipe ingredients per usage.
function buildGroceryList(plan: CoachingPlanDraft): string[] {
  const cookCounts = new Map<string, number>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      if (meal.recipeName) cookCounts.set(meal.recipeName, (cookCounts.get(meal.recipeName) ?? 0) + 1)
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

// Auto-created per-slot recipe copies look like "Name (d2-lunch)" — drop them once no slot uses them.
function removeOrphanSlotRecipes(plan: CoachingPlanDraft): CoachingPlanDraft {
  const referenced = new Set<string>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      if (meal.recipeName) referenced.add(meal.recipeName)
    }
  }
  return {
    ...plan,
    recipes: plan.recipes.filter((r) => !/\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\)$/.test(r.name) || referenced.has(r.name)),
  }
}

function dayMacroTotal(day: CoachingPlanDraft['mealPlan'][number]) {
  const meals = [day.breakfast, day.lunch, day.dinner, ...day.snacks]
  const raw = meals.reduce((total, meal) => {
    const parsed = parseMealMacroLine(meal.macros)
    return {
      calories: total.calories + parsed.calories,
      protein: total.protein + parsed.protein,
      carbs: total.carbs + parsed.carbs,
      fats: total.fats + parsed.fats,
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
  return {
    calories: Math.round(raw.calories),
    protein: Math.round(raw.protein * 10) / 10,
    carbs: Math.round(raw.carbs * 10) / 10,
    fats: Math.round(raw.fats * 10) / 10,
  }
}


function TextInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-1">
      <span className="admin-label">{label}</span>
      <input className="admin-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="space-y-1">
      <span className="admin-label">{label}</span>
      <textarea className="admin-input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export default function CoachingPlanEditor({
  clientId,
  initialPlan,
  onboardingData,
  initialPlanningInputs,
  canGenerateAi,
}: Props) {
  const router = useRouter()
  const [plan, setPlan] = useState<CoachingPlanDraft>(initialPlan ?? emptyCoachingPlan)
  const [planningInputs, setPlanningInputs] = useState<MacroCalculationInputs>(() => (
    mergePlanningInputs(onboardingData, initialPlanningInputs)
  ))
  const [pending, setPending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [libraryRecipes, setLibraryRecipes] = useState<LibraryRecipe[]>([])
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([])
  const [workoutDays, setWorkoutDays] = useState<2 | 3 | 4 | 5>(() => parseDaysPerWeek(stringField(asRecord(onboardingData.lifestyle), 'strengthTraining')))
  const [workoutMinutes, setWorkoutMinutes] = useState<number>(45)
  const [workoutLevel, setWorkoutLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [workoutEquipment, setWorkoutEquipment] = useState<string[]>(['bodyweight', 'dumbbells', 'cable', 'machine'])

  useEffect(() => {
    fetch('/api/admin/recipes')
      .then(r => r.json())
      .then(d => setLibraryRecipes(d.recipes ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/exercises')
      .then(r => r.json())
      .then(d => setLibraryExercises(d.exercises ?? []))
      .catch(() => {})
  }, [])

  const calculatedMacros = calculateMacroTargets(planningInputs)
  const hasSavedMacros = Object.values(plan.macroTargets).some((value) => value.trim())
  useEffect(() => {
    if (!hasSavedMacros && calculatedMacros) {
      setPlan((current) => ({ ...current, macroTargets: calculatedMacros }))
    }
  }, [calculatedMacros, hasSavedMacros])

  function updateMacro(key: keyof CoachingPlanDraft['macroTargets'], value: string) {
    setPlan((current) => ({
      ...current,
      macroTargets: { ...current.macroTargets, [key]: value },
    }))
  }

  function updatePlanningInput(key: keyof MacroCalculationInputs, value: string) {
    setPlanningInputs((current) => ({ ...current, [key]: value }))
  }

  function applyLibraryRecipeToMeal(dayIndex: number, mealKey: 'breakfast' | 'lunch' | 'dinner', libRecipeName: string) {
    const libRecipe = libraryRecipes.find(r => r.name === libRecipeName)
    setPlan(current => {
      let newRecipes = current.recipes
      if (libRecipe && !current.recipes.some(r => r.name === libRecipeName)) {
        newRecipes = [...current.recipes, {
          name: libRecipe.name, mealType: libRecipe.meal_type,
          servings: libRecipe.family_servings, familyServings: libRecipe.family_servings,
          clientServing: '', clientServingMultiplier: '', clientServingGrams: '',
          clientServingMeasure: '', clientServingBreakdown: '',
          prepTime: '', cookTime: '', calories: '', protein: '', carbs: '', fats: '',
          ingredients: libRecipe.ingredients, instructions: libRecipe.instructions,
          swaps: [], notes: libRecipe.notes,
        }]
      }
      const recipe = newRecipes.find(r => r.name === libRecipeName)
      const mealPlan = [...current.mealPlan]
      const day = mealPlan[dayIndex]
      mealPlan[dayIndex] = {
        ...day,
        [mealKey]: {
          name: libRecipeName || '',
          recipeName: libRecipeName || '',
          description: '',
          macros: recipe ? recipeMacroLabel(recipe) : '',
        },
      }
      return { ...current, recipes: newRecipes, mealPlan }
    })
  }

  function applyLibraryRecipeToSnack(dayIndex: number, snackIndex: number, libRecipeName: string) {
    const libRecipe = libraryRecipes.find(r => r.name === libRecipeName)
    setPlan(current => {
      let newRecipes = current.recipes
      if (libRecipe && !current.recipes.some(r => r.name === libRecipeName)) {
        newRecipes = [...current.recipes, {
          name: libRecipe.name, mealType: libRecipe.meal_type,
          servings: libRecipe.family_servings, familyServings: libRecipe.family_servings,
          clientServing: '', clientServingMultiplier: '', clientServingGrams: '',
          clientServingMeasure: '', clientServingBreakdown: '',
          prepTime: '', cookTime: '', calories: '', protein: '', carbs: '', fats: '',
          ingredients: libRecipe.ingredients, instructions: libRecipe.instructions,
          swaps: [], notes: libRecipe.notes,
        }]
      }
      const recipe = newRecipes.find(r => r.name === libRecipeName)
      const mealPlan = [...current.mealPlan]
      const day = mealPlan[dayIndex]
      const snacks = [...(day.snacks ?? [])]
      snacks[snackIndex] = libRecipeName
        ? { name: libRecipeName, recipeName: libRecipeName, description: '', macros: recipe ? recipeMacroLabel(recipe) : '' }
        : { name: '', recipeName: '', description: '', macros: '' }
      mealPlan[dayIndex] = { ...day, snacks }
      return { ...current, recipes: newRecipes, mealPlan }
    })
  }

  function addIngredientToSlot(dayIndex: number, mealKey: 'breakfast' | 'lunch' | 'dinner', ingredient: string) {
    setPlan(current => {
      const meal = current.mealPlan[dayIndex][mealKey]
      // Use a slot-specific key so ingredients never bleed across slots
      const slotKey = `d${dayIndex + 1}-${mealKey}`
      const sharedName = meal.recipeName || ''
      const slotRecipeName = sharedName ? `${sharedName} (${slotKey})` : `Custom ${mealKey} (${slotKey})`

      const newRecipes = [...current.recipes]
      // If this slot doesn't yet have its own copy, clone the shared recipe (or start fresh)
      if (!newRecipes.some(r => r.name === slotRecipeName)) {
        const source = newRecipes.find(r => r.name === sharedName)
        newRecipes.push(source
          ? { ...source, name: slotRecipeName }
          : {
              name: slotRecipeName, mealType: mealKey, servings: '1', familyServings: '1',
              clientServing: '', clientServingMultiplier: '', clientServingGrams: '',
              clientServingMeasure: '', clientServingBreakdown: '',
              prepTime: '', cookTime: '', calories: '', protein: '', carbs: '', fats: '',
              ingredients: [], instructions: [], swaps: [], notes: '',
            }
        )
      }
      const idx = newRecipes.findIndex(r => r.name === slotRecipeName)
      newRecipes[idx] = { ...newRecipes[idx], ingredients: [...newRecipes[idx].ingredients, ingredient] }

      const mealPlan = [...current.mealPlan]
      mealPlan[dayIndex] = { ...mealPlan[dayIndex], [mealKey]: { ...meal, recipeName: slotRecipeName, name: slotRecipeName } }
      return { ...current, recipes: newRecipes, mealPlan }
    })
  }

  function removeIngredientFromSlot(dayIndex: number, mealKey: 'breakfast' | 'lunch' | 'dinner', ingredientIndex: number) {
    setPlan(current => {
      const recipeName = current.mealPlan[dayIndex][mealKey].recipeName
      if (!recipeName) return current
      const newRecipes = current.recipes.map(r =>
        r.name === recipeName ? { ...r, ingredients: r.ingredients.filter((_, i) => i !== ingredientIndex) } : r
      )
      return { ...current, recipes: newRecipes }
    })
  }

  function addIngredientToSnackSlot(dayIndex: number, snackIndex: number, ingredient: string) {
    setPlan(current => {
      const snacks = [...(current.mealPlan[dayIndex].snacks ?? [])]
      const snack = snacks[snackIndex] ?? { name: '', recipeName: '', description: '', macros: '' }
      const slotKey = `d${dayIndex + 1}-snack${snackIndex}`
      const sharedName = snack.recipeName || ''
      const slotRecipeName = sharedName ? `${sharedName} (${slotKey})` : `Custom Snack (${slotKey})`

      const newRecipes = [...current.recipes]
      if (!newRecipes.some(r => r.name === slotRecipeName)) {
        const source = newRecipes.find(r => r.name === sharedName)
        newRecipes.push(source
          ? { ...source, name: slotRecipeName }
          : {
              name: slotRecipeName, mealType: 'snack', servings: '1', familyServings: '1',
              clientServing: '', clientServingMultiplier: '', clientServingGrams: '',
              clientServingMeasure: '', clientServingBreakdown: '',
              prepTime: '', cookTime: '', calories: '', protein: '', carbs: '', fats: '',
              ingredients: [], instructions: [], swaps: [], notes: '',
            }
        )
      }
      const idx = newRecipes.findIndex(r => r.name === slotRecipeName)
      newRecipes[idx] = { ...newRecipes[idx], ingredients: [...newRecipes[idx].ingredients, ingredient] }

      snacks[snackIndex] = { ...snack, recipeName: slotRecipeName, name: slotRecipeName }
      const mealPlan = [...current.mealPlan]
      mealPlan[dayIndex] = { ...mealPlan[dayIndex], snacks }
      return { ...current, recipes: newRecipes, mealPlan }
    })
  }

  function removeIngredientFromSnackSlot(dayIndex: number, snackIndex: number, ingredientIndex: number) {
    setPlan(current => {
      const recipeName = current.mealPlan[dayIndex].snacks[snackIndex]?.recipeName
      if (!recipeName) return current
      const newRecipes = current.recipes.map(r =>
        r.name === recipeName ? { ...r, ingredients: r.ingredients.filter((_, i) => i !== ingredientIndex) } : r
      )
      return { ...current, recipes: newRecipes }
    })
  }

  function generateWorkout() {
    if (libraryExercises.length === 0) {
      setError('Exercise Library is empty. Add exercises before generating.')
      return
    }
    setError('')
    const next = generateWorkoutPlan(libraryExercises, {
      daysPerWeek: workoutDays,
      minutesPerSession: workoutMinutes,
      equipment: workoutEquipment,
      level: workoutLevel,
    })
    setPlan(current => ({ ...current, workoutPlan: next }))
    setMessage(`Generated ${next.length}-day workout plan.`)
  }

  function updateWorkoutDay(dayIndex: number, patch: Partial<CoachingPlanDraft['workoutPlan'][number]>) {
    setPlan(current => {
      const wp = [...current.workoutPlan]
      wp[dayIndex] = { ...wp[dayIndex], ...patch }
      return { ...current, workoutPlan: wp }
    })
  }

  function updateWorkoutExercise(dayIndex: number, exIndex: number, patch: Partial<CoachingPlanDraft['workoutPlan'][number]['exercises'][number]>) {
    setPlan(current => {
      const wp = [...current.workoutPlan]
      const exercises = [...wp[dayIndex].exercises]
      exercises[exIndex] = { ...exercises[exIndex], ...patch }
      wp[dayIndex] = { ...wp[dayIndex], exercises }
      return { ...current, workoutPlan: wp }
    })
  }

  function swapWorkoutExercise(dayIndex: number, exIndex: number, libraryId: string) {
    const ex = libraryExercises.find(e => e.id === libraryId)
    if (!ex) return
    updateWorkoutExercise(dayIndex, exIndex, {
      name: ex.name,
      sets: ex.default_sets,
      reps: ex.default_reps,
      rest: ex.default_rest,
      videoUrl: ex.video_url,
      notes: ex.cues,
    })
  }

  function addWorkoutExercise(dayIndex: number) {
    setPlan(current => {
      const wp = [...current.workoutPlan]
      wp[dayIndex] = {
        ...wp[dayIndex],
        exercises: [...wp[dayIndex].exercises, { name: '', sets: '3', reps: '10', rest: '60s', videoUrl: '', notes: '' }],
      }
      return { ...current, workoutPlan: wp }
    })
  }

  function removeWorkoutExercise(dayIndex: number, exIndex: number) {
    setPlan(current => {
      const wp = [...current.workoutPlan]
      wp[dayIndex] = { ...wp[dayIndex], exercises: wp[dayIndex].exercises.filter((_, i) => i !== exIndex) }
      return { ...current, workoutPlan: wp }
    })
  }

  function addWorkoutDay() {
    setPlan(current => ({
      ...current,
      workoutPlan: [...current.workoutPlan, {
        day: `Day ${current.workoutPlan.length + 1}`,
        focus: '',
        warmup: '',
        exercises: [],
        cardio: '',
        cooldown: '',
        notes: '',
      }],
    }))
  }

  function removeWorkoutDay(dayIndex: number) {
    setPlan(current => ({ ...current, workoutPlan: current.workoutPlan.filter((_, i) => i !== dayIndex) }))
  }

  function applyMacroEstimate() {
    setError('')
    setMessage('')

    if (!calculatedMacros) {
      setError('Add age, height, and current weight before calculating macros.')
      return
    }

    setPlan((current) => ({ ...current, macroTargets: calculatedMacros }))
    setMessage('Macro estimate applied. Review and override anything you want.')
  }

  async function savePlan(nextPlan = plan) {
    setPending(true)
    setError('')
    setMessage('')

    nextPlan = removeOrphanSlotRecipes(nextPlan)

    // Map each recipe to the meal slot where it's actually used (first use wins),
    // so portions size to the right meal and multiple snacks share the snack budget.
    const pcts = {
      breakfast: (firstNumber(planningInputs.breakfastPct) || 35) / 100,
      lunch: (firstNumber(planningInputs.lunchPct) || 30) / 100,
      dinner: (firstNumber(planningInputs.dinnerPct) || 25) / 100,
      snack: (firstNumber(planningInputs.snackPct) || 10) / 100,
    }
    const slotPctByRecipe = new Map<string, number>()
    for (const day of nextPlan.mealPlan) {
      for (const mealKey of ['breakfast', 'lunch', 'dinner'] as const) {
        const name = day[mealKey].recipeName
        if (name && !slotPctByRecipe.has(name)) slotPctByRecipe.set(name, pcts[mealKey])
      }
      const snackCount = Math.max(1, day.snacks.filter((s) => s.recipeName).length)
      for (const snack of day.snacks) {
        if (snack.recipeName && !slotPctByRecipe.has(snack.recipeName)) {
          slotPctByRecipe.set(snack.recipeName, pcts.snack / snackCount)
        }
      }
    }

    // Auto-calculate USDA macros for any recipe that has ingredients
    const dailyCalories = firstNumber(nextPlan.macroTargets.calories)
    const individualPlanStyle = planningInputs.mealPlanStyle === 'individual_only'
    const recipesToCalc = nextPlan.recipes
      .map((recipe, index) => ({ recipe, index }))
      .filter(({ recipe }) => recipe.ingredients.length > 0)
    const skippedRecipes: string[] = []

    if (recipesToCalc.length > 0) {
      const results = await Promise.all(recipesToCalc.map(async ({ recipe, index }) => {
        // Family recipes (serves more than 1) get the client's portion carved out
        // to her meal calorie target. Individual recipes are eaten as entered.
        const familyCount = firstNumber(recipe.familyServings || recipe.servings)
        const isFamily = !individualPlanStyle && familyCount > 1
        const slotPct = slotPctByRecipe.get(recipe.name)
        const targetCalories = isFamily && dailyCalories
          ? (slotPct !== undefined
            ? dailyCalories * slotPct
            : mealCalorieTarget(recipe.mealType, dailyCalories, planningInputs))
          : undefined

        const res = await fetch('/api/admin/coaching/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: recipe.ingredients,
            clientServingMultiplier: isFamily ? undefined : '1',
            targetCalories,
            familyServings: recipe.familyServings || recipe.servings,
          }),
        })
        const data = await res.json().catch(() => ({} as UsdaNutritionResponse)) as UsdaNutritionResponse
        return { index, nutrition: data.nutrition ?? null }
      }))

      const updatedRecipes = [...nextPlan.recipes]
      for (const { index, nutrition } of results) {
        const r = updatedRecipes[index]
        // Never overwrite macros with zeros when USDA matched nothing (e.g. cup/tbsp units).
        if (!nutrition || nutrition.ingredients.length === 0 || !nutrition.totalRecipe.calories) {
          skippedRecipes.push(r.name)
          continue
        }
        updatedRecipes[index] = {
          ...r,
          clientServingMultiplier: nutrition.clientServingMultiplier.toFixed(2),
          clientServingGrams: `${nutrition.clientServingGrams}g`,
          clientServingMeasure: nutrition.clientServingMeasure,
          clientServingBreakdown: nutrition.clientServingBreakdown,
          clientServing: nutrition.clientServingBreakdown || `${nutrition.clientServingGrams}g`,
          calories: `${nutrition.clientServing.calories}`,
          protein: `${nutrition.clientServing.protein}g`,
          carbs: `${nutrition.clientServing.carbs}g`,
          fats: `${nutrition.clientServing.fats}g`,
        }
      }

      // Also update meal plan descriptions with fresh macros
      const updateMealMacros = (meal: CoachingPlanDraft['mealPlan'][number]['breakfast']) => {
        const recipe = updatedRecipes.find((r) => r.name && r.name === meal.recipeName)
        if (!recipe) return meal
        return {
          ...meal,
          description: [
            recipe.clientServingGrams ? `Client portion: ${recipe.clientServingGrams}.` : '',
            recipe.clientServingMeasure ? `${recipe.clientServingMeasure}.` : '',
            recipe.familyServings ? `Serves ${recipe.familyServings}.` : '',
          ].filter(Boolean).join(' '),
          macros: recipeMacroLabel(recipe),
        }
      }

      nextPlan = {
        ...nextPlan,
        recipes: updatedRecipes,
        mealPlan: nextPlan.mealPlan.map((day) => ({
          ...day,
          breakfast: updateMealMacros(day.breakfast),
          lunch: updateMealMacros(day.lunch),
          dinner: updateMealMacros(day.dinner),
          snacks: day.snacks.map(updateMealMacros),
        })),
      }
    }

    // Fill the grocery list from the recipes in the meal plan when it's empty.
    if (nextPlan.groceryList.length === 0) {
      const generated = buildGroceryList(nextPlan)
      if (generated.length > 0) nextPlan = { ...nextPlan, groceryList: generated }
    }
    setPlan(nextPlan)

    const response = await fetch('/api/admin/coaching/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, plan: nextPlan, planningInputs }),
    })
    const result = await response.json().catch(() => ({} as {
      error?: string
      plan?: CoachingPlanDraft
      planningInputs?: MacroCalculationInputs
    }))

    if (!response.ok) {
      setError(result.error || 'Could not save the plan.')
    } else {
      if (result.plan) setPlan(result.plan)
      if (result.planningInputs) setPlanningInputs(result.planningInputs)
      setMessage(skippedRecipes.length
        ? `Plan saved, but USDA macros were skipped for: ${skippedRecipes.join(', ')}. Use gram-based ingredient lines (e.g. "150g cooked chicken breast") so macros calculate.`
        : 'Plan saved.')
      router.refresh()
    }

    setPending(false)
  }

  async function generateDraft() {
    setGenerating(true)
    setError('')
    setMessage('')

    const response = await fetch('/api/admin/coaching/plan-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, planningInputs, libraryRecipes }),
    })
    const result = await response.json().catch(() => ({} as { error?: string; plan?: CoachingPlanDraft }))

    if (!response.ok || !result.plan) {
      setError(result.error || 'Could not generate a draft.')
    } else {
      setPlan(result.plan)
      setMessage('AI draft created. Review and save when ready.')
    }

    setGenerating(false)
  }

  const sCard: React.CSSProperties = {
    background: 'var(--admin-surface)',
    border: '1px solid var(--admin-outline-variant)',
    borderRadius: 14,
    overflow: 'hidden',
  }

  const sHeader: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--admin-outline-variant)',
  }

  const sBody: React.CSSProperties = { padding: '16px 20px 20px' }

  const sDivider: React.CSSProperties = {
    height: 1, background: 'var(--admin-outline-variant)', margin: '16px 0',
  }

  function SectionNum({ n, done }: { n: number | string; done?: boolean }) {
    return (
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: done ? '#2e7d32' : '#162814',
        color: done ? '#fff' : '#C9A84C',
        fontSize: '0.72rem', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done ? '✓' : n}
      </div>
    )
  }

  function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <div>
        <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.97rem', color: 'var(--admin-on-surface)' }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', color: 'var(--admin-on-surface-variant)', marginTop: 1 }}>{subtitle}</div>
      </div>
    )
  }

  const saveBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 8,
    fontFamily: 'var(--font-hanken)', fontSize: '0.84rem', fontWeight: 700,
    background: '#C9A84C', color: '#162814',
    border: 'none', cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header ── */}
      <div style={{ ...sCard, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--admin-on-surface)', lineHeight: 1.2 }}>
            Coaching Plan
          </h2>
          <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8rem', color: 'var(--admin-on-surface-variant)', marginTop: 2 }}>
            Draft macros, meal plan, recipes, and grocery list. Publish when ready for the client.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={!canGenerateAi || generating}
            onClick={generateDraft}
            title={canGenerateAi ? 'Generate a draft from onboarding' : 'Add OPENAI_API_KEY to enable AI drafts'}
          >
            <Sparkles size={14} />
            {generating ? 'Generating...' : 'Generate AI Draft'}
          </button>
          <button type="button" style={saveBtn} disabled={pending} onClick={() => savePlan()}>
            {pending ? 'Calculating & Saving...' : 'Save Plan →'}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.85rem', fontWeight: 600, color: '#1b5e20', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.85rem', fontWeight: 600, color: '#B42318', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
          {error}
        </p>
      )}

      {/* ── Section 1: Client Inputs ── */}
      <details style={sCard} open>
        <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionNum n={1} done />
            <SectionTitle title="Client Inputs" subtitle="Age, weight, goals, preferences — used to calculate macros" />
          </div>
          <ChevronDown size={16} style={{ color: 'var(--admin-on-surface-variant)', flexShrink: 0 }} />
        </summary>
        <div style={{ ...sBody, borderTop: '1px solid var(--admin-outline-variant)' }}>
          <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.82rem', color: 'var(--admin-on-surface-variant)', marginBottom: 16 }}>
            Correct anything the client entered before calculating macros. These edits are for this plan only and don&apos;t rewrite the original onboarding submission.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <TextInput label="Age" value={planningInputs.age} onChange={(v) => updatePlanningInput('age', v)} />
            <TextInput label="Height" value={planningInputs.height} onChange={(v) => updatePlanningInput('height', v)} />
            <TextInput label="Current Weight" value={planningInputs.weight} onChange={(v) => updatePlanningInput('weight', v)} />
            <TextInput label="Goal Weight" value={planningInputs.targetWeight} onChange={(v) => updatePlanningInput('targetWeight', v)} />
            <label className="space-y-1">
              <span className="admin-label">Plan Goal</span>
              <select className="admin-input" value={planningInputs.planGoal} onChange={(e) => updatePlanningInput('planGoal', e.target.value)}>
                <option value="recomposition">Body Recomposition</option>
                <option value="fat_loss">Fat Loss</option>
                <option value="build_muscle">Build Muscle</option>
                <option value="maintenance">Maintenance</option>
                <option value="performance">Performance Support</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="admin-label">Meal Plan Style</span>
              <select className="admin-input" value={planningInputs.mealPlanStyle} onChange={(e) => updatePlanningInput('mealPlanStyle', e.target.value)}>
                <option value="family_dinners">Family Dinners + Her Servings</option>
                <option value="individual_only">Individual Plan Only</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="admin-label">Daily Activity</span>
              <select className="admin-input" value={planningInputs.activityLevel} onChange={(e) => updatePlanningInput('activityLevel', e.target.value)}>
                <option value="mostly_sedentary">Mostly Sedentary</option>
                <option value="light_daily_movement">Light Daily Movement</option>
                <option value="moderate_daily_movement">Moderate Daily Movement</option>
                <option value="very_active_lifestyle">Very Active Lifestyle</option>
              </select>
            </label>
            <TextInput label="Average Steps" value={planningInputs.steps} onChange={(v) => updatePlanningInput('steps', v)} />
            <TextInput label="Water Intake" value={planningInputs.water} onChange={(v) => updatePlanningInput('water', v)} />
            <label className="space-y-1">
              <span className="admin-label">Strength Training</span>
              <select className="admin-input" value={planningInputs.strengthTraining} onChange={(e) => updatePlanningInput('strengthTraining', e.target.value)}>
                <option value="not_sure">Not Sure / Need to Ask</option>
                <option value="none">None Right Now</option>
                <option value="1_2_days">1-2 Days Per Week</option>
                <option value="3_4_days">3-4 Days Per Week</option>
                <option value="5_plus_days">5+ Days Per Week</option>
              </select>
            </label>
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TextArea label="Primary Goal" value={planningInputs.primaryGoal} onChange={(v) => updatePlanningInput('primaryGoal', v)} />
            <TextArea label="Strength Details / Equipment" value={planningInputs.strengthTrainingDetails || planningInputs.workouts} onChange={(v) => updatePlanningInput('strengthTrainingDetails', v)} />
            <TextArea label="Food Allergies / Restrictions" value={[planningInputs.allergies, planningInputs.restrictions].filter(Boolean).join('\n')} onChange={(v) => {
              const [allergies = '', ...restrictions] = v.split('\n')
              setPlanningInputs((current) => ({ ...current, allergies: allergies.trim(), restrictions: restrictions.join('\n').trim() }))
            }} />
            <TextArea label="Foods They Like / Dislike" value={[planningInputs.favoriteFoods, planningInputs.dislikedFoods].filter(Boolean).join('\n')} onChange={(v) => {
              const [favoriteFoods = '', ...dislikedFoods] = v.split('\n')
              setPlanningInputs((current) => ({ ...current, favoriteFoods: favoriteFoods.trim(), dislikedFoods: dislikedFoods.join('\n').trim() }))
            }} />
            <TextArea label="Health Notes" value={[planningInputs.medicalConditions, planningInputs.medications, planningInputs.injuries].filter(Boolean).join('\n')} onChange={(v) => {
              const [medicalConditions = '', medications = '', ...injuries] = v.split('\n')
              setPlanningInputs((current) => ({
                ...current,
                medicalConditions: medicalConditions.trim(),
                medications: medications.trim(),
                injuries: injuries.join('\n').trim(),
              }))
            }} />
            <TextArea label="Normal Day Of Eating" value={planningInputs.currentEating} onChange={(v) => updatePlanningInput('currentEating', v)} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn-secondary" onClick={applyMacroEstimate}>
              Calculate Macro Estimate
            </button>
            <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', margin: 0, fontSize: '0.82rem' }}>
              {calculatedMacros
                ? `Estimate ready: ${calculatedMacros.calories} cal · ${calculatedMacros.protein} protein`
                : 'Age, height, and current weight are required for the estimate.'}
            </p>
          </div>
        </div>
      </details>

      {/* ── Section 2: Macro Targets ── */}
      <div style={sCard}>
        <div style={sHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionNum n={2} done={hasSavedMacros} />
            <SectionTitle title="Macro Targets" subtitle="Daily nutrition goals sent to the client" />
          </div>
        </div>
        <div style={sBody}>
          {/* Big 4 macro cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {([
              { key: 'calories' as const, label: 'Calories', unit: 'cal' },
              { key: 'protein' as const, label: 'Protein', unit: 'g' },
              { key: 'carbs' as const, label: 'Carbs', unit: 'g' },
              { key: 'fats' as const, label: 'Fat', unit: 'g' },
            ] as const).map(({ key, label, unit }) => (
              <div key={key} style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-on-surface-variant)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--admin-on-surface)', lineHeight: 1 }}>
                  {firstNumber(plan.macroTargets[key]) || '—'}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--admin-on-surface-variant)', marginLeft: 3 }}>{unit}</span>
                </div>
                <input
                  className="admin-input"
                  style={{ marginTop: 8, fontSize: '0.82rem', padding: '5px 8px' }}
                  value={plan.macroTargets[key]}
                  onChange={(e) => updateMacro(key, e.target.value)}
                  placeholder={`e.g. 1625 ${unit}`}
                />
              </div>
            ))}
          </div>

          {/* Secondary targets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
            <TextInput label="Fiber" value={plan.macroTargets.fiber} onChange={(v) => updateMacro('fiber', v)} />
            <TextInput label="Water" value={plan.macroTargets.water} onChange={(v) => updateMacro('water', v)} />
            <TextInput label="Steps" value={plan.macroTargets.steps} onChange={(v) => updateMacro('steps', v)} />
            <TextInput label="Workout Target" value={plan.macroTargets.workoutTarget} onChange={(v) => updateMacro('workoutTarget', v)} />
          </div>

          {/* Calorie split per meal */}
          <div style={sDivider} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-on-surface-variant)' }}>Calorie Distribution Per Meal</div>
              <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', marginTop: 2 }}>Breakfast heaviest for weight loss. Adjust if client exercises at night.</div>
            </div>
          </div>
          {(() => {
            const daily = firstNumber(plan.macroTargets.calories)
            const bPct = firstNumber(planningInputs.breakfastPct) || 35
            const lPct = firstNumber(planningInputs.lunchPct) || 30
            const dPct = firstNumber(planningInputs.dinnerPct) || 25
            const sPct = firstNumber(planningInputs.snackPct) || 10
            const total = bPct + lPct + dPct + sPct
            const meals: Array<{ key: 'breakfastPct' | 'lunchPct' | 'dinnerPct' | 'snackPct'; label: string; pct: number; cal: number | null }> = [
              { key: 'breakfastPct', label: 'Breakfast', pct: bPct, cal: daily ? Math.round(daily * bPct / 100) : null },
              { key: 'lunchPct', label: 'Lunch', pct: lPct, cal: daily ? Math.round(daily * lPct / 100) : null },
              { key: 'dinnerPct', label: 'Dinner', pct: dPct, cal: daily ? Math.round(daily * dPct / 100) : null },
              { key: 'snackPct', label: 'Snack', pct: sPct, cal: daily ? Math.round(daily * sPct / 100) : null },
            ]
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {meals.map(({ key, label, pct, cal }) => (
                    <div key={key} style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-on-surface-variant)', textAlign: 'center' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '1.4rem', fontWeight: 800, color: '#C9A84C', textAlign: 'center', margin: '4px 0 2px' }}>{pct}%</div>
                      {cal !== null && <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', textAlign: 'center' }}>{cal} cal</div>}
                      <div style={{ height: 5, background: 'var(--admin-outline-variant)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: '#C9A84C', width: `${pct}%` }} />
                      </div>
                      <input
                        className="admin-input"
                        type="number"
                        style={{ marginTop: 8, fontSize: '0.78rem', padding: '4px 8px', textAlign: 'center' }}
                        value={planningInputs[key]}
                        onChange={(e) => updatePlanningInput(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                {total !== 100 && (
                  <p style={{ fontFamily: 'var(--font-hanken)', color: '#B42318', fontSize: '0.82rem', marginTop: 8 }}>
                    Percentages add up to {total}% — adjust so they total 100%.
                  </p>
                )}
              </>
            )
          })()}
        </div>
      </div>

      {/* ── Section 3: Notes & Status ── */}
      <div style={sCard}>
        <div style={sHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionNum n={3} done={!!(plan.clientNotes || plan.adminNotes)} />
            <SectionTitle title="Notes & Status" subtitle="Client-facing notes vs. your private coaching notes" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span className="admin-label" style={{ marginBottom: 0 }}>Status</span>
            <select
              className="admin-input"
              style={{ width: 'auto', fontSize: '0.82rem', padding: '5px 28px 5px 10px' }}
              value={plan.status}
              onChange={(e) => setPlan((current) => ({ ...current, status: e.target.value as CoachingPlanDraft['status'] }))}
            >
              <option value="draft">Draft</option>
              <option value="ready_for_client">Ready for Client</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <p
          role="status"
          style={{
            fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', fontWeight: 600, margin: 0,
            padding: '8px 16px',
            color: plan.status === 'published' ? '#1b5e20' : '#7A5505',
            background: plan.status === 'published' ? '#e8f5e9' : '#FDF6E3',
            borderBottom: '1px solid var(--admin-outline-variant)',
          }}
        >
          {plan.status === 'published'
            ? 'Live — your client can see this plan in her coaching portal.'
            : 'Hidden from your client — only “Published” plans appear in her coaching portal.'}
        </p>
        <div style={{ ...sBody, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <TextArea
            label="Client Notes (shown to client)"
            value={plan.clientNotes}
            onChange={(v) => setPlan((current) => ({ ...current, clientNotes: v }))}
          />
          <TextArea
            label="Admin Notes (private)"
            value={plan.adminNotes}
            onChange={(v) => setPlan((current) => ({ ...current, adminNotes: v }))}
          />
        </div>
      </div>

      {/* ── Section 4: Meal Plan ── */}
      <div style={sCard}>
        <div style={sHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionNum n={4} done={plan.mealPlan.length > 0} />
            <SectionTitle title="Meal Plan" subtitle="Pick meals from your Recipe Library or add custom ingredients per slot" />
          </div>
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ flexShrink: 0 }}
            onClick={() => setPlan((current) => ({
              ...current,
              mealPlan: [...current.mealPlan, {
                day: `Day ${current.mealPlan.length + 1}`,
                breakfast: { name: '', description: '', macros: '', recipeName: '' },
                lunch: { name: '', description: '', macros: '', recipeName: '' },
                dinner: { name: '', description: '', macros: '', recipeName: '' },
                snacks: [],
                notes: '',
              }],
            }))}
          >
            + Add Day
          </button>
        </div>
        <div style={{ ...sBody, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plan.mealPlan.length === 0 && (
            <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
              No days added yet. Click &quot;+ Add Day&quot; to start building the week. Add recipes first at{' '}
              <a href="/admin/recipes" style={{ color: 'var(--admin-primary)', fontWeight: 600 }}>Recipe Library</a>.
            </p>
          )}
          {plan.mealPlan.map((day, dayIndex) => (
            <details key={dayIndex} style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: 10, overflow: 'hidden' }} open={dayIndex === 0}>
              <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: 'var(--admin-surface-low)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--admin-on-surface)' }}>{day.day || `Day ${dayIndex + 1}`}</div>
                  {(() => {
                    const total = dayMacroTotal(day)
                    const hasDayMacros = total.calories || total.protein || total.carbs || total.fats
                    const dailyTarget = firstNumber(plan.macroTargets.calories)
                    const diff = dailyTarget ? total.calories - dailyTarget : 0
                    const offTarget = dailyTarget > 0 && Math.abs(diff) > dailyTarget * 0.1
                    return hasDayMacros ? (
                      <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', marginTop: 2 }}>
                        {total.calories} cal{dailyTarget ? ` of ${dailyTarget} target` : ''} · {total.protein}g protein · {total.carbs}g carbs · {total.fats}g fat
                        {offTarget && (
                          <span style={{ color: '#B42318', fontWeight: 700 }}>
                            {' '}· {diff > 0 ? `${diff} over` : `${Math.abs(diff)} under`}
                          </span>
                        )}
                      </div>
                    ) : null
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    style={{ color: 'var(--admin-error)', fontSize: '0.78rem' }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setPlan((current) => ({
                        ...current,
                        mealPlan: current.mealPlan.filter((_, i) => i !== dayIndex),
                      }))
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                  <ChevronDown size={15} style={{ color: 'var(--admin-on-surface-variant)' }} />
                </div>
              </summary>
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--admin-outline-variant)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <TextInput label="Day Label" value={day.day} onChange={(v) => {
                    const mealPlan = [...plan.mealPlan]
                    mealPlan[dayIndex] = { ...day, day: v }
                    setPlan((current) => ({ ...current, mealPlan }))
                  }} />
                  <TextInput label="Daily Notes" value={day.notes} onChange={(v) => {
                    const mealPlan = [...plan.mealPlan]
                    mealPlan[dayIndex] = { ...day, notes: v }
                    setPlan((current) => ({ ...current, mealPlan }))
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {(['breakfast', 'lunch', 'dinner'] as const).map((mealKey) => {
                    const meal = day[mealKey]
                    const mealRecipe = plan.recipes.find(r => r.name === meal.recipeName)
                    const ingredients = mealRecipe?.ingredients ?? []
                    return (
                      <div key={mealKey} style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)', borderRadius: 9, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'capitalize', color: 'var(--admin-on-surface)' }}>{mealKey}</div>
                        <select
                          className="admin-input"
                          style={{ fontSize: '0.83rem' }}
                          value={meal.recipeName}
                          onChange={(e) => applyLibraryRecipeToMeal(dayIndex, mealKey, e.target.value)}
                        >
                          <option value="">— no recipe —</option>
                          {meal.recipeName && !libraryRecipes.some((r) => r.name === meal.recipeName) && (
                            <option value={meal.recipeName}>Custom: {meal.recipeName.replace(/\s*\(d\d+-[a-z]+\d*\)$/, '')}</option>
                          )}
                          {libraryRecipes.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                        {ingredients.length > 0 && (
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {ingredients.map((ing, i) => (
                              <li key={i} style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.72rem', color: 'var(--admin-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                <span style={{ flex: 1 }}>{ing.replace(/^\[fdc:\d+\]\s*/, '')}</span>
                                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)', fontSize: '0.85rem', padding: '0 2px', flexShrink: 0 }}
                                  onClick={() => removeIngredientFromSlot(dayIndex, mealKey, i)}>×</button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <IngredientPicker onAdd={(ing) => addIngredientToSlot(dayIndex, mealKey, ing)} />
                      </div>
                    )
                  })}
                  {/* Snack slots */}
                  <div style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)', borderRadius: 9, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--admin-on-surface)' }}>Snacks</div>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-hanken)', fontSize: '0.72rem', fontWeight: 700, color: '#C9A84C', padding: 0 }}
                        onClick={() => {
                          const mealPlan = [...plan.mealPlan]
                          mealPlan[dayIndex] = { ...day, snacks: [...(day.snacks ?? []), { name: '', recipeName: '', description: '', macros: '' }] }
                          setPlan(c => ({ ...c, mealPlan }))
                        }}
                      >+ Add Snack</button>
                    </div>
                    {(day.snacks.length === 0 ? [{ name: '', recipeName: '', description: '', macros: '' }] : day.snacks).map((snack, snackIndex) => {
                      const snackRecipe = plan.recipes.find(r => r.name === snack.recipeName)
                      const snackIngredients = snackRecipe?.ingredients ?? []
                      return (
                        <div key={snackIndex} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: snackIndex < day.snacks.length - 1 ? 8 : 0, borderBottom: snackIndex < day.snacks.length - 1 ? '1px solid var(--admin-outline-variant)' : 'none' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select
                              className="admin-input"
                              style={{ fontSize: '0.83rem', flex: 1 }}
                              value={snack.recipeName}
                              onChange={(e) => applyLibraryRecipeToSnack(dayIndex, snackIndex, e.target.value)}
                            >
                              <option value="">— no snack —</option>
                              {snack.recipeName && !libraryRecipes.some((r) => r.name === snack.recipeName) && (
                                <option value={snack.recipeName}>Custom: {snack.recipeName.replace(/\s*\(d\d+-[a-z]+\d*\)$/, '')}</option>
                              )}
                              {libraryRecipes.map((r) => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                              ))}
                            </select>
                            {day.snacks.length > 0 && (
                              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-error)', fontSize: '1rem', padding: '0 2px', flexShrink: 0 }}
                                onClick={() => {
                                  const mealPlan = [...plan.mealPlan]
                                  mealPlan[dayIndex] = { ...day, snacks: day.snacks.filter((_, j) => j !== snackIndex) }
                                  setPlan(c => ({ ...c, mealPlan }))
                                }}>×</button>
                            )}
                          </div>
                          {snackIngredients.length > 0 && (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {snackIngredients.map((ing, i) => (
                                <li key={i} style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.72rem', color: 'var(--admin-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                  <span style={{ flex: 1 }}>{ing.replace(/^\[fdc:\d+\]\s*/, '')}</span>
                                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)', fontSize: '0.85rem', padding: '0 2px', flexShrink: 0 }}
                                    onClick={() => removeIngredientFromSnackSlot(dayIndex, snackIndex, i)}>×</button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <IngredientPicker onAdd={(ing) => addIngredientToSnackSlot(dayIndex, snackIndex, ing)} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* ── Section 5: Workout Plan ── */}
      <div style={sCard}>
        <div style={sHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionNum n={5} done={plan.workoutPlan.length > 0} />
            <SectionTitle title="Workout Plan" subtitle="Generate a structured week from your Exercise Library, then swap or tweak per client" />
          </div>
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ flexShrink: 0 }}
            onClick={generateWorkout}
          >
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Generate from Library
          </button>
        </div>
        <div style={sBody}>
          {/* Generator inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16, padding: 12, background: 'var(--admin-surface-low)', borderRadius: 8 }}>
            <label>
              <span className="admin-label">Days/week</span>
              <select className="admin-input" value={workoutDays} onChange={e => setWorkoutDays(Number(e.target.value) as 2|3|4|5)}>
                <option value={2}>2 days</option>
                <option value={3}>3 days</option>
                <option value={4}>4 days</option>
                <option value={5}>5 days</option>
              </select>
            </label>
            <label>
              <span className="admin-label">Minutes/session</span>
              <select className="admin-input" value={workoutMinutes} onChange={e => setWorkoutMinutes(Number(e.target.value))}>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={75}>75 min</option>
              </select>
            </label>
            <label>
              <span className="admin-label">Level</span>
              <select className="admin-input" value={workoutLevel} onChange={e => setWorkoutLevel(e.target.value as 'beginner'|'intermediate'|'advanced')}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              <span className="admin-label">Equipment</span>
              <input
                className="admin-input"
                value={workoutEquipment.join(', ')}
                onChange={e => setWorkoutEquipment(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="bodyweight, dumbbells, cable"
              />
            </label>
          </div>

          {plan.workoutPlan.length === 0 && (
            <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
              No workout days yet. Click <strong>Generate from Library</strong> to auto-build a week, or{' '}
              <button type="button" onClick={addWorkoutDay} style={{ background: 'none', border: 'none', color: 'var(--admin-primary)', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit' }}>
                add a blank day
              </button>.
              Build your library at <a href="/admin/exercises" style={{ color: 'var(--admin-primary)', fontWeight: 600 }}>Exercise Library</a>.
            </p>
          )}

          {plan.workoutPlan.map((day, dayIndex) => (
            <details key={dayIndex} style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }} open={dayIndex === 0}>
              <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: 'var(--admin-surface-low)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--admin-on-surface)' }}>{day.day || `Day ${dayIndex + 1}`}</div>
                  <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', marginTop: 2 }}>
                    {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    style={{ color: 'var(--admin-error)', fontSize: '0.78rem', padding: '4px 8px' }}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); removeWorkoutDay(dayIndex) }}
                    aria-label="Remove day"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronDown size={15} style={{ color: 'var(--admin-on-surface-variant)' }} />
                </div>
              </summary>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--admin-outline-variant)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>
                    <span className="admin-label">Day Label</span>
                    <input className="admin-input" value={day.day} onChange={e => updateWorkoutDay(dayIndex, { day: e.target.value })} />
                  </label>
                  <label>
                    <span className="admin-label">Focus</span>
                    <input className="admin-input" value={day.focus} onChange={e => updateWorkoutDay(dayIndex, { focus: e.target.value })} placeholder="e.g. Lower Body" />
                  </label>
                </div>

                <label>
                  <span className="admin-label">Warm-up</span>
                  <textarea className="admin-input" rows={2} style={{ resize: 'vertical' }} value={day.warmup} onChange={e => updateWorkoutDay(dayIndex, { warmup: e.target.value })} />
                </label>

                {/* Exercises */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="admin-label" style={{ marginBottom: 0 }}>Exercises</span>
                    <button type="button" className="admin-btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => addWorkoutExercise(dayIndex)}>
                      + Add exercise
                    </button>
                  </div>
                  {day.exercises.length === 0 && (
                    <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', color: 'var(--admin-on-surface-variant)', margin: '4px 0' }}>No exercises yet.</p>
                  )}
                  {day.exercises.map((exercise, exIndex) => {
                    const libMatch = libraryExercises.find(e => e.name === exercise.name)
                    const pattern = libMatch?.movement_pattern
                    const swappable = pattern
                      ? libraryExercises.filter(e => e.movement_pattern === pattern && !e.archived)
                      : libraryExercises.filter(e => !e.archived)
                    return (
                      <div key={exIndex} style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: 8, padding: 10, marginBottom: 6, background: 'var(--admin-surface)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px auto', gap: 8, alignItems: 'flex-end' }}>
                          <label>
                            <span className="admin-label">Exercise</span>
                            <select
                              className="admin-input"
                              value={libMatch?.id ?? ''}
                              onChange={e => {
                                if (e.target.value) swapWorkoutExercise(dayIndex, exIndex, e.target.value)
                                else updateWorkoutExercise(dayIndex, exIndex, { name: '', videoUrl: '' })
                              }}
                            >
                              <option value="">{exercise.name || 'Pick from library…'}</option>
                              {swappable.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="admin-label">Sets</span>
                            <input className="admin-input" value={exercise.sets} onChange={e => updateWorkoutExercise(dayIndex, exIndex, { sets: e.target.value })} />
                          </label>
                          <label>
                            <span className="admin-label">Reps</span>
                            <input className="admin-input" value={exercise.reps} onChange={e => updateWorkoutExercise(dayIndex, exIndex, { reps: e.target.value })} />
                          </label>
                          <label>
                            <span className="admin-label">Rest</span>
                            <input className="admin-input" value={exercise.rest} onChange={e => updateWorkoutExercise(dayIndex, exIndex, { rest: e.target.value })} />
                          </label>
                          <button
                            type="button"
                            className="admin-btn-ghost"
                            style={{ color: 'var(--admin-error)', padding: '4px 6px' }}
                            onClick={() => removeWorkoutExercise(dayIndex, exIndex)}
                            aria-label="Remove exercise"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <label style={{ display: 'block', marginTop: 8 }}>
                          <span className="admin-label">Demo Video URL</span>
                          <input
                            className="admin-input"
                            value={exercise.videoUrl}
                            onChange={e => updateWorkoutExercise(dayIndex, exIndex, { videoUrl: e.target.value })}
                            placeholder="Saved library URL, or paste a YouTube demo link"
                          />
                        </label>
                        <label style={{ display: 'block', marginTop: 8 }}>
                          <span className="admin-label">Notes / Cues</span>
                          <textarea className="admin-input" rows={2} style={{ resize: 'vertical', fontSize: '0.82rem' }} value={exercise.notes} onChange={e => updateWorkoutExercise(dayIndex, exIndex, { notes: e.target.value })} />
                        </label>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>
                    <span className="admin-label">Cardio</span>
                    <textarea className="admin-input" rows={2} style={{ resize: 'vertical' }} value={day.cardio} onChange={e => updateWorkoutDay(dayIndex, { cardio: e.target.value })} />
                  </label>
                  <label>
                    <span className="admin-label">Cool-down</span>
                    <textarea className="admin-input" rows={2} style={{ resize: 'vertical' }} value={day.cooldown} onChange={e => updateWorkoutDay(dayIndex, { cooldown: e.target.value })} />
                  </label>
                </div>

                <label>
                  <span className="admin-label">Day Notes (shown to client)</span>
                  <textarea className="admin-input" rows={2} style={{ resize: 'vertical' }} value={day.notes} onChange={e => updateWorkoutDay(dayIndex, { notes: e.target.value })} />
                </label>
              </div>
            </details>
          ))}

          {plan.workoutPlan.length > 0 && (
            <button type="button" className="admin-btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={addWorkoutDay}>
              + Add Day
            </button>
          )}
        </div>
      </div>

      {/* ── Section 6: Grocery List ── */}
      <details style={sCard}>
        <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionNum n={6} done={plan.groceryList.length > 0} />
            <SectionTitle title="Grocery List" subtitle="Fills in from the meal plan's recipes on save when empty — clear it to regenerate, or edit manually" />
          </div>
          <ChevronDown size={16} style={{ color: 'var(--admin-on-surface-variant)', flexShrink: 0 }} />
        </summary>
        <div style={{ ...sBody, borderTop: '1px solid var(--admin-outline-variant)' }}>
          <TextArea
            label="One item per line"
            rows={8}
            value={joinLines(plan.groceryList)}
            onChange={(v) => setPlan((current) => ({ ...current, groceryList: splitLines(v) }))}
          />
        </div>
      </details>

      {/* ── Save footer ── */}
      <div style={{ background: '#162814', borderRadius: 12, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.95rem', color: '#C9A84C' }}>Ready to save?</div>
          <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            Client portions calculate automatically. Status stays Draft until you publish.
          </div>
        </div>
        <button type="button" style={{ ...saveBtn, flexShrink: 0 }} disabled={pending} onClick={() => savePlan()}>
          {pending ? 'Calculating & Saving...' : 'Save Plan →'}
        </button>
      </div>

    </div>
  )
}
