'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import { emptyCoachingPlan } from '@/lib/coaching-plan-schema'

type Props = {
  clientId: string
  initialPlan: CoachingPlanDraft | null
  canGenerateAi: boolean
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

export default function CoachingPlanEditor({ clientId, initialPlan, canGenerateAi }: Props) {
  const [plan, setPlan] = useState<CoachingPlanDraft>(initialPlan ?? emptyCoachingPlan)
  const [pending, setPending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function updateMacro(key: keyof CoachingPlanDraft['macroTargets'], value: string) {
    setPlan((current) => ({
      ...current,
      macroTargets: { ...current.macroTargets, [key]: value },
    }))
  }

  async function savePlan(nextPlan = plan) {
    setPending(true)
    setError('')
    setMessage('')

    const response = await fetch('/api/admin/coaching/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, plan: nextPlan }),
    })
    const result = await response.json().catch(() => ({} as { error?: string }))

    if (!response.ok) {
      setError(result.error || 'Could not save the plan.')
    } else {
      setMessage('Plan saved.')
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
      body: JSON.stringify({ clientId }),
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
              {day.day || `Day ${dayIndex + 1}`}
              <ChevronDown size={16} />
            </summary>
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
                  <TextInput label="Meal Name" value={day[mealKey].name} onChange={(v) => {
                    const mealPlan = [...plan.mealPlan]
                    mealPlan[dayIndex] = { ...day, [mealKey]: { ...day[mealKey], name: v } }
                    setPlan((current) => ({ ...current, mealPlan }))
                  }} />
                  <TextArea label="Description" value={day[mealKey].description} rows={2} onChange={(v) => {
                    const mealPlan = [...plan.mealPlan]
                    mealPlan[dayIndex] = { ...day, [mealKey]: { ...day[mealKey], description: v } }
                    setPlan((current) => ({ ...current, mealPlan }))
                  }} />
                  <TextInput label="Macros" value={day[mealKey].macros} onChange={(v) => {
                    const mealPlan = [...plan.mealPlan]
                    mealPlan[dayIndex] = { ...day, [mealKey]: { ...day[mealKey], macros: v } }
                    setPlan((current) => ({ ...current, mealPlan }))
                  }} />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.375rem', fontWeight: 700 }}>Recipes</h3>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setPlan((current) => ({
              ...current,
              recipes: [...current.recipes, {
                name: '',
                mealType: '',
                servings: '',
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
              {recipe.name || `Recipe ${index + 1}`}
              <ChevronDown size={16} />
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
              <TextInput label="Calories" value={recipe.calories} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, calories: v }
                setPlan((current) => ({ ...current, recipes }))
              }} />
              <TextInput label="Protein / Carbs / Fats" value={`${recipe.protein} / ${recipe.carbs} / ${recipe.fats}`} onChange={(v) => {
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
              <TextArea label="Cooking Instructions, one per line" value={joinLines(recipe.instructions)} onChange={(v) => {
                const recipes = [...plan.recipes]
                recipes[index] = { ...recipe, instructions: splitLines(v) }
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
