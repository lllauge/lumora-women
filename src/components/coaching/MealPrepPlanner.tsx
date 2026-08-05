'use client'

import { Minus, Plus, UsersRound, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  cleanIngredientText,
  clientPortionFactor,
  exactPortionsCookFactor,
  familyCookFactor,
  practicalPortionDivision,
  ingredientGrams,
  ingredientWeighState,
  shortIngredientName,
} from '@/lib/client-portion'
import { approxWeightMeasure, householdMeasure, seasoningSpoonAmount } from '@/lib/household-measure'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import {
  mealPrepSelectionsSnapshot,
  parseMealPrepSelections,
  subscribeMealPrepSelections,
  writeMealPrepSelection,
} from '@/components/coaching/mealPrepSelectionStore'

type Recipe = CoachingPlanDraft['recipes'][number]

const stepButton: React.CSSProperties = {
  width: '2rem',
  height: '2rem',
  borderRadius: '999px',
  border: '1px solid rgba(63,105,54,0.28)',
  background: 'rgba(255,255,255,0.55)',
  color: '#3F6936',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: 0,
}

const helpText: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  lineHeight: 1.45,
  margin: '0.125rem 0 0',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function scaledIngredientLines(recipe: Recipe, factor: number) {
  return recipe.ingredients
    .map((ingredient) => {
      const grams = ingredientGrams(ingredient)
      const name = shortIngredientName(ingredient)
      if (!name) return null
      if (grams === null) {
        const cleaned = cleanIngredientText(ingredient)
        return {
          amount: factor > 1.01 ? `${Number(factor.toFixed(2))}x` : '',
          name: cleaned,
          state: ingredientWeighState(cleaned),
        }
      }
      const scaled = Math.max(1, Math.round(grams * factor))
      return {
        amount: seasoningSpoonAmount(name, scaled) ?? `${scaled}g`,
        easyAmount: householdMeasure(name, scaled) ?? approxWeightMeasure(scaled),
        name,
        state: ingredientWeighState(ingredient),
      }
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line))
}

function MealPrepStepper({
  label,
  hint,
  value,
  min,
  max,
  setValue,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  setValue: (value: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
      <div style={{ minWidth: '12rem', flex: '1 1 12rem' }}>
        <p style={fieldLabel}>{label}</p>
        <p style={helpText}>{hint}</p>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => setValue(clamp(value - 1, min, max))} style={stepButton}>
          <Minus size={14} aria-hidden="true" />
        </button>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: '2ch', textAlign: 'center' }}>
          {value}
        </span>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => setValue(clamp(value + 1, min, max))} style={stepButton}>
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default function MealPrepPlanner({
  recipe,
  individualPlanStyle,
  storageKey,
  occurrenceKey,
}: {
  recipe: Recipe
  individualPlanStyle: boolean
  storageKey?: string
  occurrenceKey?: string
}) {
  const [openMode, setOpenMode] = useState<'meal-prep' | 'family' | null>(null)
  const [localPortions, setLocalPortions] = useState<number | null>(null)
  const portionFactor = clientPortionFactor(recipe, individualPlanStyle)
  const selectionsSnapshot = useSyncExternalStore(
    (listener) => storageKey ? subscribeMealPrepSelections(storageKey, listener) : () => {},
    () => storageKey ? mealPrepSelectionsSnapshot(storageKey) : '',
    () => '',
  )
  const selections = useMemo(() => parseMealPrepSelections(selectionsSnapshot), [selectionsSnapshot])
  const savedSelection = occurrenceKey ? selections[occurrenceKey] : undefined
  const savedMode = savedSelection?.mode
    ?? (savedSelection?.peopleEating && savedSelection.peopleEating > 1 ? 'family' : savedSelection ? 'meal-prep' : null)
  const savedExactPortions = savedMode === 'meal-prep'
    ? Math.max(1, Math.round(savedSelection?.portions ?? ((savedSelection?.prepPortions ?? 0) + 1)))
    : 1
  const exactPortions = localPortions ?? savedExactPortions
  const familyFactor = familyCookFactor(portionFactor)
  const familyDivision = practicalPortionDivision(portionFactor / familyFactor)
  const panelFactor = openMode === 'family'
    ? familyFactor
    : exactPortionsCookFactor(portionFactor, exactPortions)
  const lines = useMemo(() => scaledIngredientLines(recipe, panelFactor), [recipe, panelFactor])
  const servingWeight = recipe.clientServingGrams.trim().replace(/\s*g$/i, '')
  const servingCalories = recipe.calories.trim().replace(/\s*k?cal$/i, '')

  const buttonStyle = (active = false): React.CSSProperties => ({
    fontFamily: 'var(--font-sans)',
    fontSize: '0.78rem',
    fontWeight: 700,
    borderRadius: '999px',
    border: active ? '1px solid var(--botanical-green)' : '1px solid rgba(63,105,54,0.3)',
    background: active ? 'var(--botanical-green)' : 'rgba(255,255,255,0.36)',
    color: active ? '#FFFFFF' : '#3F6936',
    minHeight: '2rem',
    padding: '0.375rem 0.75rem',
    cursor: 'pointer',
  })

  const persistSelection = (
    mode: 'meal-prep' | 'family' | null,
    portions: number,
    totalFactor: number,
  ) => {
    if (!storageKey || !occurrenceKey) return
    writeMealPrepSelection(storageKey, occurrenceKey, mode
      ? { mode, portions, totalFactor }
      : null)
  }

  const openMealPrep = () => {
    if (openMode === 'meal-prep') {
      setOpenMode(null)
      return
    }
    setOpenMode('meal-prep')
    setLocalPortions(savedMode === 'meal-prep' ? savedExactPortions : 1)
    if (savedMode === 'family') persistSelection(null, 1, portionFactor)
  }

  const openFamily = () => {
    if (openMode === 'family') {
      setOpenMode(null)
      return
    }
    setOpenMode('family')
    persistSelection('family', familyFactor, familyFactor)
  }

  const setExactPortions = (value: number) => {
    const portions = clamp(value, 1, 7)
    setLocalPortions(portions)
    const totalFactor = exactPortionsCookFactor(portionFactor, portions)
    persistSelection(portions === 1 ? null : 'meal-prep', portions, totalFactor)
  }

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(200,220,192,0.6)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          aria-expanded={openMode === 'meal-prep'}
          aria-pressed={savedMode === 'meal-prep'}
          onClick={openMealPrep}
          style={{ ...buttonStyle(openMode === 'meal-prep' || savedMode === 'meal-prep'), display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <UtensilsCrossed size={14} aria-hidden="true" />
          Meal prep
        </button>
        <button
          type="button"
          aria-expanded={openMode === 'family'}
          aria-pressed={savedMode === 'family'}
          onClick={openFamily}
          style={{ ...buttonStyle(openMode === 'family' || savedMode === 'family'), display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <UsersRound size={14} aria-hidden="true" />
          Cook for family
        </button>
      </div>

      {openMode && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {openMode === 'meal-prep' && (
            <MealPrepStepper
              label="How many exact portions do you want to prepare?"
              hint={`Every portion matches your plan${servingCalories ? ` at ${servingCalories} calories` : ''}${servingWeight ? ` and ${servingWeight}g cooked` : ''}.`}
              value={exactPortions}
              min={1}
              max={7}
              setValue={setExactPortions}
            />
          )}

          <div style={{ background: 'rgba(255,255,255,0.38)', border: '1px solid rgba(63,105,54,0.14)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {openMode === 'meal-prep' ? (
                <>
                  Prepare <strong style={{ color: 'var(--text-primary)' }}>{exactPortions} exact {exactPortions === 1 ? 'portion' : 'portions'}</strong>.
                  {servingWeight
                    ? exactPortions === 1
                      ? ` Place the finished ${servingWeight}g serving in one container.`
                      : ` Divide the finished food into ${exactPortions} containers of ${servingWeight}g each.`
                    : exactPortions === 1
                      ? ' Place the full finished serving in one container.'
                      : ` Divide the finished food evenly among ${exactPortions} containers.`}
                </>
              ) : (
                <>
                  Cook <strong style={{ color: 'var(--text-primary)' }}>{familyFactor === 1 ? 'the full recipe' : `${familyFactor} full recipe batches`}</strong>.
                  {servingWeight
                    ? ` After cooking, set aside ${servingWeight}g for your exact portion. Your family can eat the rest.`
                    : ` After cooking, set aside ${Math.round((portionFactor / familyFactor) * 100)}% of the finished food for your exact portion. Your family can eat the rest.`}
                </>
              )}
            </p>
            {openMode === 'family' && familyDivision && (
              <p style={{ ...helpText, marginTop: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>
                  Without a scale{familyDivision.relativeDifference > 0.01 ? ' (close estimate)' : ''}:
                </strong>{' '}
                Divide the finished food into {familyDivision.parts} equal portions and eat {familyDivision.take} {familyDivision.take === 1 ? 'portion' : 'portions'} yourself. Your family can eat the rest. Weighing your cooked portion is the most accurate method.
              </p>
            )}
            {lines.length > 0 && (
              <>
                <p style={{ ...helpText, marginTop: '0.625rem' }}>
                  Prepare these ingredient amounts unless a line says cooked weight.
                </p>
                <ul style={{ listStyle: 'none', margin: '0.625rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {lines.map((line, index) => (
                    <li key={`${line.name}-${index}`} style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem' }}>
                      {line.amount && (
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 800, color: '#3F6936', minWidth: '3.75rem', textAlign: 'right' }}>
                          {line.amount}
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {line.name}
                        {'easyAmount' in line && line.easyAmount && !line.amount.includes('tsp') && !line.amount.includes('tbsp') && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> · about {line.easyAmount}</span>
                        )}
                        {line.state === 'raw' && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · raw ingredient</span>
                        )}
                        {line.state === 'cooked' && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · cooked weight</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
