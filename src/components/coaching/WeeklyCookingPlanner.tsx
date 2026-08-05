'use client'

import { Minus, Plus, ChevronDown } from 'lucide-react'
import { useMemo, useSyncExternalStore } from 'react'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import { mealRecipeNames } from '@/lib/coaching-plan-schema'
import {
  clientPortionFactor,
  exactPortionsCookFactor,
  householdCookFactor,
} from '@/lib/client-portion'
import { mealPrepOccurrenceKey } from '@/lib/grocery-list'
import {
  type MealPrepSelection,
  mealPrepSelectionsSnapshot,
  parseMealPrepSelections,
  subscribeMealPrepSelections,
  writeMealPrepSelection,
} from '@/components/coaching/mealPrepSelectionStore'

type CookingMode = 'just-me' | 'meal-prep' | 'family'
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type Recipe = CoachingPlanDraft['recipes'][number]
type Occurrence = {
  key: string
  dayLabel: string
  mealLabel: string
  mealType: MealType
  recipe: Recipe
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function displayRecipeName(name: string) {
  const suffix = /\s*\(d\d+-(?:breakfast|lunch|dinner|snack\d*)\)\s*$/i
  let cleaned = name.trim()
  while (suffix.test(cleaned)) cleaned = cleaned.replace(suffix, '').trim()
  return cleaned || name.trim()
}

function originalServingCount(recipe: Recipe) {
  const parsed = parseFloat(recipe.familyServings)
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : 4
}

function selectionMode(selection?: MealPrepSelection): CookingMode {
  if (!selection) return 'just-me'
  if (selection.mode === 'family' || (!selection.mode && (selection.peopleEating ?? 0) > 1)) return 'family'
  return 'meal-prep'
}

function occurrenceSelection(
  occurrence: Occurrence,
  mode: CookingMode,
  quantity?: number,
): MealPrepSelection | null {
  if (mode === 'just-me') return null
  const portionFactor = clientPortionFactor(occurrence.recipe, false)
  if (mode === 'meal-prep') {
    const portions = clamp(Math.round(quantity ?? 2), 2, 7)
    return { mode, portions, totalFactor: exactPortionsCookFactor(portionFactor, portions) }
  }
  const originalServings = originalServingCount(occurrence.recipe)
  const familyPeople = clamp(Math.round(quantity ?? originalServings), 2, 12)
  return {
    mode,
    portions: 1,
    familyPeople,
    totalFactor: householdCookFactor(portionFactor, originalServings, familyPeople),
  }
}

function weeklyOccurrences(plan: CoachingPlanDraft): Occurrence[] {
  const recipes = new Map(plan.recipes.map((recipe) => [recipe.name, recipe]))
  return plan.mealPlan.flatMap((day, dayIndex) => {
    const rows = [
      { mealType: 'breakfast' as const, mealKey: 'breakfast', mealLabel: 'Breakfast', meal: day.breakfast },
      { mealType: 'lunch' as const, mealKey: 'lunch', mealLabel: 'Lunch', meal: day.lunch },
      { mealType: 'dinner' as const, mealKey: 'dinner', mealLabel: 'Dinner', meal: day.dinner },
      ...day.snacks.map((meal, snackIndex) => ({
        mealType: 'snack' as const,
        mealKey: `snack${snackIndex}`,
        mealLabel: day.snacks.length > 1 ? `Snack ${snackIndex + 1}` : 'Snack',
        meal,
      })),
    ]
    return rows.flatMap((row) => mealRecipeNames(row.meal).flatMap((recipeName) => {
      const recipe = recipes.get(recipeName)
      return recipe ? [{
        key: mealPrepOccurrenceKey(dayIndex, row.mealKey, recipeName),
        dayLabel: day.day.trim() || `Day ${dayIndex + 1}`,
        mealLabel: row.mealLabel,
        mealType: row.mealType,
        recipe,
      }] : []
    }))
  })
}

function QuantityControl({
  label,
  value,
  min,
  max,
  setValue,
}: {
  label: string
  value: number
  min: number
  max: number
  setValue: (value: number) => void
}) {
  const buttonStyle: React.CSSProperties = {
    width: '1.9rem', height: '1.9rem', borderRadius: '50%', border: '1px solid rgba(63,105,54,0.3)',
    background: '#FFFFFF', color: '#3F6936', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => setValue(clamp(value - 1, min, max))} style={buttonStyle}>
        <Minus size={13} aria-hidden="true" />
      </button>
      <span style={{ minWidth: '2ch', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
        {value}
      </span>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => setValue(clamp(value + 1, min, max))} style={buttonStyle}>
        <Plus size={13} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function WeeklyCookingPlanner({
  plan,
  storageKey,
}: {
  plan: CoachingPlanDraft
  storageKey: string
}) {
  const snapshot = useSyncExternalStore(
    (listener) => subscribeMealPrepSelections(storageKey, listener),
    () => mealPrepSelectionsSnapshot(storageKey),
    () => '',
  )
  const selections = useMemo(() => parseMealPrepSelections(snapshot), [snapshot])
  const occurrences = useMemo(() => weeklyOccurrences(plan), [plan])
  const selectedCount = occurrences.filter((occurrence) => selectionMode(selections[occurrence.key]) !== 'just-me').length

  const setChoice = (occurrence: Occurrence, mode: CookingMode, quantity?: number) => {
    writeMealPrepSelection(storageKey, occurrence.key, occurrenceSelection(occurrence, mode, quantity))
  }

  const applyToMealType = (source: Occurrence) => {
    const selection = selections[source.key]
    const mode = selectionMode(selection)
    const quantity = mode === 'family'
      ? selection?.familyPeople ?? selection?.peopleEating
      : selection?.portions ?? ((selection?.prepPortions ?? 1) + 1)
    for (const occurrence of occurrences.filter((item) => item.mealType === source.mealType)) {
      writeMealPrepSelection(storageKey, occurrence.key, occurrenceSelection(occurrence, mode, quantity))
    }
  }

  if (occurrences.length === 0) return null

  return (
    <div className="portal-card" style={{ marginBottom: '1rem' }}>
      <div className="portal-gold-line" aria-hidden="true" />
      <details className="portal-details">
        <summary style={{
          padding: '0.875rem 1.25rem', minHeight: '52px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '0.75rem',
        }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Plan this week&apos;s cooking
            </span>
            <span style={{ display: 'block', marginTop: '0.15rem', fontFamily: 'var(--font-sans)', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
              Optional. Groceries already include your prescribed portions. Add only meal prep or family servings.
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            {selectedCount > 0 && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 700, color: '#3F6936', background: 'rgba(63,105,54,0.1)', borderRadius: '999px', padding: '0.2rem 0.45rem' }}>
                {selectedCount} saved
              </span>
            )}
            <ChevronDown className="portal-chevron" style={{ width: '1rem', height: '1rem', color: 'var(--botanical-green)' }} aria-hidden="true" />
          </span>
        </summary>
        <div style={{ padding: '0 1.25rem 1rem' }}>
          {occurrences.map((occurrence, index) => {
            const selection = selections[occurrence.key]
            const mode = selectionMode(selection)
            const mealPrepPortions = clamp(Math.round(selection?.portions ?? ((selection?.prepPortions ?? 1) + 1)), 2, 7)
            const familyPeople = clamp(Math.round(selection?.familyPeople ?? selection?.peopleEating ?? originalServingCount(occurrence.recipe)), 2, 12)
            const matchingMeals = occurrences.filter((item) => item.mealType === occurrence.mealType).length
            return (
              <div key={occurrence.key} style={{ borderTop: index === 0 ? 'none' : '1px solid rgba(200,220,192,0.35)', padding: '0.75rem 0' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem 0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 700, color: '#3F6936' }}>
                      {occurrence.dayLabel} · {occurrence.mealLabel}
                    </p>
                    <p style={{ margin: '0.1rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {displayRecipeName(occurrence.recipe.name)}
                    </p>
                  </div>
                  <select
                    aria-label={`Cooking choice for ${occurrence.dayLabel} ${occurrence.mealLabel} ${displayRecipeName(occurrence.recipe.name)}`}
                    value={mode}
                    onChange={(event) => setChoice(occurrence, event.target.value as CookingMode)}
                    style={{
                      minHeight: '2.25rem', borderRadius: '0.4rem', border: '1px solid rgba(63,105,54,0.25)',
                      background: '#FFFFFF', padding: '0.35rem 0.55rem', fontFamily: 'var(--font-sans)',
                      fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)',
                    }}
                  >
                    <option value="just-me">Just my serving</option>
                    <option value="meal-prep">Meal prep</option>
                    <option value="family">Cook for family</option>
                  </select>
                </div>
                {mode !== 'just-me' && (
                  <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem 0.75rem' }}>
                    <div>
                      <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {mode === 'family' ? 'People eating, including you' : 'Your exact portions total'}
                      </p>
                      {mode === 'family' && (
                        <p style={{ margin: '0.1rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Original recipe: {originalServingCount(occurrence.recipe)} servings
                        </p>
                      )}
                    </div>
                    <QuantityControl
                      label={`${occurrence.dayLabel} ${occurrence.mealLabel}`}
                      value={mode === 'family' ? familyPeople : mealPrepPortions}
                      min={2}
                      max={mode === 'family' ? 12 : 7}
                      setValue={(value) => setChoice(occurrence, mode, value)}
                    />
                    {matchingMeals > 1 && (
                      <button
                        type="button"
                        onClick={() => applyToMealType(occurrence)}
                        style={{
                          border: 'none', background: 'none', padding: '0.25rem', cursor: 'pointer',
                          fontFamily: 'var(--font-sans)', fontSize: '0.7rem', fontWeight: 700, color: '#3F6936',
                        }}
                      >
                        Apply to all {occurrence.mealType === 'snack' ? 'snacks' : `${occurrence.mealType}s`} this week
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}
