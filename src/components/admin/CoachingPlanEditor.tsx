'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, Sparkles, Trash2 } from 'lucide-react'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import { emptyCoachingPlan } from '@/lib/coaching-plan-schema'
import {
  calculateMacroTargets,
  type MacroCalculationInputs,
} from '@/lib/coaching-macro-calculator'

type UsdaNutritionResponse = {
  error?: string
  nutrition?: {
    clientServingMultiplier: number
    clientServingGrams: number
    clientServingMeasure: string
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

function mealCalorieTarget(mealType: string, dailyCalories: number) {
  const type = mealType.toLowerCase()
  if (type.includes('breakfast')) return dailyCalories * 0.25
  if (type.includes('lunch')) return dailyCalories * 0.3
  if (type.includes('dinner')) return dailyCalories * 0.35
  if (type.includes('snack')) return dailyCalories * 0.1
  return dailyCalories * 0.3
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

function dayMacroTotal(day: CoachingPlanDraft['mealPlan'][number]) {
  const meals = [day.breakfast, day.lunch, day.dinner, ...day.snacks]
  return meals.reduce((total, meal) => {
    const parsed = parseMealMacroLine(meal.macros)
    return {
      calories: total.calories + parsed.calories,
      protein: total.protein + parsed.protein,
      carbs: total.carbs + parsed.carbs,
      fats: total.fats + parsed.fats,
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
}

function recipeMacroAverage(recipes: CoachingPlanDraft['recipes']) {
  const withMacros = recipes.filter((recipe) => recipe.calories || recipe.protein || recipe.carbs || recipe.fats)
  if (withMacros.length === 0) return null

  const total = withMacros.reduce((sum, recipe) => ({
    calories: sum.calories + firstNumber(recipe.calories),
    protein: sum.protein + firstNumber(recipe.protein),
    carbs: sum.carbs + firstNumber(recipe.carbs),
    fats: sum.fats + firstNumber(recipe.fats),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  return {
    count: withMacros.length,
    calories: Math.round(total.calories / withMacros.length),
    protein: Math.round(total.protein / withMacros.length),
    carbs: Math.round(total.carbs / withMacros.length),
    fats: Math.round(total.fats / withMacros.length),
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
  const [calculatingRecipeIndex, setCalculatingRecipeIndex] = useState<number | null>(null)
  const [calculatingAllServings, setCalculatingAllServings] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const calculatedMacros = calculateMacroTargets(planningInputs)
  const hasSavedMacros = Object.values(plan.macroTargets).some((value) => value.trim())
  const recipeAverage = recipeMacroAverage(plan.recipes)

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

  function updateMeal(dayIndex: number, mealKey: 'breakfast' | 'lunch' | 'dinner', updates: Partial<CoachingPlanDraft['mealPlan'][number]['breakfast']>) {
    const mealPlan = [...plan.mealPlan]
    const day = mealPlan[dayIndex]
    mealPlan[dayIndex] = { ...day, [mealKey]: { ...day[mealKey], ...updates } }
    setPlan((current) => ({ ...current, mealPlan }))
  }

  function applyRecipeToMeal(dayIndex: number, mealKey: 'breakfast' | 'lunch' | 'dinner', recipeName: string) {
    const recipe = plan.recipes.find((item) => item.name === recipeName)
    if (!recipe) {
      updateMeal(dayIndex, mealKey, { recipeName })
      return
    }

    updateMeal(dayIndex, mealKey, {
      name: recipe.name,
      recipeName: recipe.name,
      description: [
        recipe.clientServing ? `Client serving: ${recipe.clientServing}.` : '',
        recipe.clientServingMeasure ? `Portion guide: ${recipe.clientServingMeasure}.` : '',
        recipe.familyServings ? `Family yield: ${recipe.familyServings}.` : '',
        recipe.notes,
      ].filter(Boolean).join(' '),
      macros: recipeMacroLabel(recipe),
    })
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
      setMessage('Plan saved.')
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
      body: JSON.stringify({ clientId, planningInputs }),
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

  async function calculateRecipeWithUsda(index: number) {
    const recipe = plan.recipes[index]
    const dailyCalories = firstNumber(plan.macroTargets.calories)
    setCalculatingRecipeIndex(index)
    setError('')
    setMessage('')

    const response = await fetch('/api/admin/coaching/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: recipe.ingredients,
        clientServingMultiplier: recipe.clientServingMultiplier,
        targetCalories: dailyCalories ? mealCalorieTarget(recipe.mealType, dailyCalories) : undefined,
        familyServings: recipe.familyServings || recipe.servings,
      }),
    })
    const result = await response.json().catch(() => ({} as UsdaNutritionResponse)) as UsdaNutritionResponse

    if (!response.ok || !result.nutrition) {
      setError(result.error || 'USDA could not calculate this recipe.')
      setCalculatingRecipeIndex(null)
      return
    }

    const { nutrition } = result
    const sourceNote = [
      `USDA calculated ${nutrition.ingredients.length} ingredients.`,
      `Client portion: ${nutrition.clientServingGrams}g. ${nutrition.clientServingMeasure}`,
      `Full recipe: ${nutrition.totalRecipe.calories} cal, ${nutrition.totalRecipe.protein}g protein, ${nutrition.totalRecipe.carbs}g carbs, ${nutrition.totalRecipe.fats}g fats.`,
      nutrition.warnings.length ? `Review warnings: ${nutrition.warnings.join(' ')}` : '',
    ].filter(Boolean).join(' ')

    setPlan((current) => {
      const recipes = [...current.recipes]
      const currentRecipe = recipes[index]
      recipes[index] = {
        ...currentRecipe,
        clientServingMultiplier: nutrition.clientServingMultiplier.toFixed(2),
        clientServingGrams: `${nutrition.clientServingGrams}g`,
        clientServingMeasure: nutrition.clientServingMeasure,
        clientServing: currentRecipe.clientServing || `${nutrition.clientServingGrams}g (${nutrition.clientServingMeasure})`,
        calories: `${nutrition.clientServing.calories}`,
        protein: `${nutrition.clientServing.protein}g`,
        carbs: `${nutrition.clientServing.carbs}g`,
        fats: `${nutrition.clientServing.fats}g`,
        notes: [currentRecipe.notes, sourceNote].filter(Boolean).join('\n\n'),
      }
      return { ...current, recipes }
    })

    setMessage(
      nutrition.warnings.length
        ? 'USDA macros applied with warnings. Review the recipe notes before publishing.'
        : 'USDA macros applied to the client serving.'
    )
    setCalculatingRecipeIndex(null)
  }

  async function calculateAllServingsWithUsda() {
    const dailyCalories = firstNumber(plan.macroTargets.calories)
    if (!dailyCalories) {
      setError('Add or calculate daily calories before auto-calculating recipe serving sizes.')
      return
    }

    const recipesToCalculate = plan.recipes
      .map((recipe, index) => ({ recipe, index }))
      .filter(({ recipe }) => recipe.ingredients.length > 0)

    if (recipesToCalculate.length === 0) {
      setError('Add recipe ingredients before auto-calculating client servings.')
      return
    }

    setCalculatingAllServings(true)
    setError('')
    setMessage('')

    try {
      const calculated = await Promise.all(recipesToCalculate.map(async ({ recipe, index }) => {
        const response = await fetch('/api/admin/coaching/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: recipe.ingredients,
            clientServingMultiplier: recipe.clientServingMultiplier,
            targetCalories: mealCalorieTarget(recipe.mealType, dailyCalories),
            familyServings: recipe.familyServings || recipe.servings,
          }),
        })
        const result = await response.json().catch(() => ({} as UsdaNutritionResponse)) as UsdaNutritionResponse
        if (!response.ok || !result.nutrition) {
          throw new Error(result.error || `USDA could not calculate ${recipe.name || `Recipe ${index + 1}`}.`)
        }

        return { index, nutrition: result.nutrition }
      }))

      setPlan((current) => {
        const recipes = current.recipes.map((recipe, index) => {
          const item = calculated.find((result) => result.index === index)
          if (!item) return recipe

          const { nutrition } = item
          const sourceNote = [
            `USDA auto-calculated client serving from ${nutrition.ingredients.length} ingredients.`,
            `Client portion: ${nutrition.clientServingGrams}g. ${nutrition.clientServingMeasure}`,
            `Full recipe: ${nutrition.totalRecipe.calories} cal, ${nutrition.totalRecipe.protein}g protein, ${nutrition.totalRecipe.carbs}g carbs, ${nutrition.totalRecipe.fats}g fats.`,
            nutrition.warnings.length ? `Review warnings: ${nutrition.warnings.join(' ')}` : '',
          ].filter(Boolean).join(' ')

          return {
            ...recipe,
            clientServingMultiplier: nutrition.clientServingMultiplier.toFixed(2),
            clientServingGrams: `${nutrition.clientServingGrams}g`,
            clientServingMeasure: nutrition.clientServingMeasure,
            clientServing: recipe.clientServing || `${nutrition.clientServingGrams}g (${nutrition.clientServingMeasure})`,
            calories: `${nutrition.clientServing.calories}`,
            protein: `${nutrition.clientServing.protein}g`,
            carbs: `${nutrition.clientServing.carbs}g`,
            fats: `${nutrition.clientServing.fats}g`,
            notes: [recipe.notes, sourceNote].filter(Boolean).join('\n\n'),
          }
        })

        const updateMeal = (meal: CoachingPlanDraft['mealPlan'][number]['breakfast']) => {
          const recipe = recipes.find((item) => item.name && item.name === meal.recipeName)
          if (!recipe) return meal
          return {
            ...meal,
            description: [
              recipe.clientServing ? `Client serving: ${recipe.clientServing}.` : '',
              recipe.clientServingMeasure ? `Portion guide: ${recipe.clientServingMeasure}.` : '',
              recipe.familyServings ? `Family yield: ${recipe.familyServings}.` : '',
            ].filter(Boolean).join(' '),
            macros: recipeMacroLabel(recipe),
          }
        }

        return {
          ...current,
          recipes,
          mealPlan: current.mealPlan.map((day) => ({
            ...day,
            breakfast: updateMeal(day.breakfast),
            lunch: updateMeal(day.lunch),
            dinner: updateMeal(day.dinner),
            snacks: day.snacks.map(updateMeal),
          })),
        }
      })

      setMessage('Client serving sizes calculated. Review the grams, easy portion guide, and any USDA warnings before saving.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'USDA could not calculate recipe serving sizes.')
    } finally {
      setCalculatingAllServings(false)
    }
  }

  return (
    <section className="admin-card p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-on-surface)' }}>
            Coaching Plan
          </h2>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
            Draft macros, meal plan, recipes, grocery list, and notes. AI drafts are not shown to the client until you save and publish.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={!canGenerateAi || generating}
            onClick={generateDraft}
            title={canGenerateAi ? 'Generate a draft from onboarding' : 'Add OPENAI_API_KEY to enable AI drafts'}
          >
            <Sparkles size={16} />
            {generating ? 'Generating...' : 'Generate AI Draft'}
          </button>
          <button type="button" className="admin-btn-primary" disabled={pending} onClick={() => savePlan()}>
            {pending ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>

      {message && <p role="status" style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-primary-container)' }}>{message}</p>}
      {error && <p role="alert" style={{ fontFamily: 'var(--font-hanken)', color: '#B42318' }}>{error}</p>}

      <details className="admin-card p-5" open>
        <summary className="flex cursor-pointer items-center justify-between gap-3" style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800 }}>
          Client Inputs Used For Planning
          <ChevronDown size={16} />
        </summary>
        <p className="mt-3" style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
          Correct anything the client entered before calculating macros or generating the AI meal-plan draft. These edits are used for this plan workflow and do not rewrite the original onboarding submission.
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
              <option value="mostly_sedentary">Mostly Sedentary - desk job, low movement</option>
              <option value="light_daily_movement">Light Daily Movement - errands, chores, some walking</option>
              <option value="moderate_daily_movement">Moderate Daily Movement - on feet often or consistent walks</option>
              <option value="very_active_lifestyle">Very Active Lifestyle - physical job or high daily movement</option>
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
          <TextArea label="Strength Details For AI / Equipment" value={planningInputs.strengthTrainingDetails || planningInputs.workouts} onChange={(v) => updatePlanningInput('strengthTrainingDetails', v)} />
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
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" className="admin-btn-secondary" onClick={applyMacroEstimate}>
            Calculate Macro Estimate
          </button>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', margin: 0 }}>
            {calculatedMacros
              ? `Estimate ready: ${calculatedMacros.calories} calories, ${calculatedMacros.protein} protein.`
              : 'Age, height, and current weight are required for the estimate.'}
          </p>
        </div>
      </details>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <TextInput label="Calories" value={plan.macroTargets.calories} onChange={(v) => updateMacro('calories', v)} />
        <TextInput label="Protein" value={plan.macroTargets.protein} onChange={(v) => updateMacro('protein', v)} />
        <TextInput label="Carbs" value={plan.macroTargets.carbs} onChange={(v) => updateMacro('carbs', v)} />
        <TextInput label="Fats" value={plan.macroTargets.fats} onChange={(v) => updateMacro('fats', v)} />
        <TextInput label="Fiber" value={plan.macroTargets.fiber} onChange={(v) => updateMacro('fiber', v)} />
        <TextInput label="Water" value={plan.macroTargets.water} onChange={(v) => updateMacro('water', v)} />
        <TextInput label="Steps" value={plan.macroTargets.steps} onChange={(v) => updateMacro('steps', v)} />
        <TextInput label="Workout Target" value={plan.macroTargets.workoutTarget} onChange={(v) => updateMacro('workoutTarget', v)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TextArea
          label="Client Notes"
          value={plan.clientNotes}
          onChange={(v) => setPlan((current) => ({ ...current, clientNotes: v }))}
        />
        <TextArea
          label="Admin Notes"
          value={plan.adminNotes}
          onChange={(v) => setPlan((current) => ({ ...current, adminNotes: v }))}
        />
      </div>

      <label className="space-y-1 block">
        <span className="admin-label">Plan Status</span>
        <select
          className="admin-input"
          value={plan.status}
          onChange={(e) => setPlan((current) => ({ ...current, status: e.target.value as CoachingPlanDraft['status'] }))}
        >
          <option value="draft">Draft</option>
          <option value="ready_for_client">Ready for Client</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.375rem', fontWeight: 700 }}>Meal Plan</h3>
          <button
            type="button"
            className="admin-btn-secondary"
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
            Add Day
          </button>
        </div>
        {plan.mealPlan.map((day, dayIndex) => (
          <details key={dayIndex} className="admin-card p-4" open={dayIndex === 0}>
            <summary className="flex items-center justify-between cursor-pointer" style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800 }}>
              <span>{day.day || `Day ${dayIndex + 1}`}</span>
              <span className="inline-flex items-center gap-3">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  style={{ padding: '0.45rem 0.7rem' }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setPlan((current) => ({
                      ...current,
                      mealPlan: current.mealPlan.filter((_, index) => index !== dayIndex),
                    }))
                  }}
                >
                  <Trash2 size={14} />
                  Delete Day
                </button>
                <ChevronDown size={16} />
              </span>
            </summary>
            {(() => {
              const total = dayMacroTotal(day)
              const hasDayMacros = total.calories || total.protein || total.carbs || total.fats
              return hasDayMacros ? (
                <p className="mt-3" style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
                  Day total from meal macro lines: {total.calories} cal, {total.protein}g protein, {total.carbs}g carbs, {total.fats}g fats.
                </p>
              ) : null
            })()}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
              {(['breakfast', 'lunch', 'dinner'] as const).map((mealKey) => (
                <div key={mealKey} className="space-y-3 rounded-lg p-4" style={{ border: '1px solid var(--admin-outline-variant)' }}>
                  <h4 className="capitalize" style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800 }}>{mealKey}</h4>
                  <label className="space-y-1 block">
                    <span className="admin-label">Use Recipe Macros</span>
                    <select
                      className="admin-input"
                      value={day[mealKey].recipeName}
                      onChange={(e) => applyRecipeToMeal(dayIndex, mealKey, e.target.value)}
                    >
                      <option value="">Choose a recipe</option>
                      {plan.recipes.filter((recipe) => recipe.name.trim()).map((recipe) => (
                        <option key={`${mealKey}-${recipe.name}`} value={recipe.name}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextInput label="Meal Name" value={day[mealKey].name} onChange={(v) => {
                    updateMeal(dayIndex, mealKey, { name: v })
                  }} />
                  <TextArea label="Description" value={day[mealKey].description} rows={2} onChange={(v) => {
                    updateMeal(dayIndex, mealKey, { description: v })
                  }} />
                  <TextInput label="Macros" value={day[mealKey].macros} onChange={(v) => {
                    updateMeal(dayIndex, mealKey, { macros: v })
                  }} />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.375rem', fontWeight: 700 }}>Recipes</h3>
            {recipeAverage && (
              <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', margin: 0 }}>
                {recipeAverage.count} recipes with macros. Average client serving: {recipeAverage.calories} cal, {recipeAverage.protein}g protein, {recipeAverage.carbs}g carbs, {recipeAverage.fats}g fats.
              </p>
            )}
          </div>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={calculatingAllServings || plan.recipes.length === 0}
            onClick={calculateAllServingsWithUsda}
          >
            {calculatingAllServings ? 'Calculating Servings...' : 'Auto-Calculate Client Servings'}
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setPlan((current) => ({
              ...current,
              recipes: [...current.recipes, {
                name: '',
                mealType: '',
                servings: '',
                familyServings: '',
                clientServing: '',
                clientServingMultiplier: '',
                clientServingGrams: '',
                clientServingMeasure: '',
                prepTime: '',
                cookTime: '',
                calories: '',
                protein: '',
                carbs: '',
                fats: '',
                ingredients: [],
                instructions: [],
                swaps: [],
                notes: '',
              }],
            }))}
          >
            Add Recipe
          </button>
        </div>
        {plan.recipes.map((recipe, index) => (
          <details key={index} className="admin-card p-4">
            <summary className="flex items-center justify-between cursor-pointer" style={{ fontFamily: 'var(--font-hanken)', fontWeight: 800 }}>
              <span>{recipe.name || `Recipe ${index + 1}`}</span>
              <span className="inline-flex items-center gap-3">
                {recipeMacroLabel(recipe) && (
                  <span style={{ color: 'var(--admin-on-surface-variant)', fontWeight: 600 }}>
                    {recipeMacroLabel(recipe)}
                  </span>
                )}
                <button
                  type="button"
                  className="admin-btn-secondary"
                  style={{ padding: '0.45rem 0.7rem' }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setPlan((current) => ({
                      ...current,
                      recipes: current.recipes.filter((_, recipeIndex) => recipeIndex !== index),
                    }))
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <ChevronDown size={16} />
              </span>
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <TextInput label="Recipe Name" value={recipe.name} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, name: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Meal Type" value={recipe.mealType} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, mealType: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Family Yield" value={recipe.familyServings || recipe.servings} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, familyServings: v, servings: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Client Serving Size" value={recipe.clientServing} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, clientServing: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Client Serving Share" value={recipe.clientServingMultiplier} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, clientServingMultiplier: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Client Serving Grams" value={recipe.clientServingGrams} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, clientServingGrams: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Easy Portion Guide" value={recipe.clientServingMeasure} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, clientServingMeasure: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Client Serving Calories" value={recipe.calories} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, calories: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Client Serving Protein / Carbs / Fats" value={`${recipe.protein} / ${recipe.carbs} / ${recipe.fats}`} onChange={(v) => {
                const [protein = '', carbs = '', fats = ''] = v.split('/').map((item) => item.trim())
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, protein, carbs, fats }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextArea label="Ingredients, one per line" value={joinLines(recipe.ingredients)} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, ingredients: splitLines(v) }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <div className="space-y-2">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={calculatingRecipeIndex === index || recipe.ingredients.length === 0}
                  onClick={() => calculateRecipeWithUsda(index)}
                >
                  {calculatingRecipeIndex === index ? 'Calculating USDA...' : 'Calculate Macros With USDA'}
                </button>
                <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Best accuracy: use ingredient weights like 150g chicken breast, 2 oz cheddar, 200g cooked rice. Leave Client Serving Share blank to auto-calculate from her macros, or type 1/2, 1/4, or 0.25 to override.
                </p>
              </div>
              <TextArea label="Cooking Instructions, one per line" value={joinLines(recipe.instructions)} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, instructions: splitLines(v) }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextArea label="Recipe Notes" value={recipe.notes} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, notes: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
            </div>
          </details>
        ))}
      </div>

      <TextArea
        label="Grocery List, one item per line"
        rows={6}
        value={joinLines(plan.groceryList)}
        onChange={(v) => setPlan((current) => ({ ...current, groceryList: splitLines(v) }))}
      />
    </section>
  )
}
