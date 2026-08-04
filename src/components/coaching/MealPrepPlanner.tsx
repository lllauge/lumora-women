'use client'

import { Minus, Plus, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  cleanIngredientText,
  clientPortionFactor,
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

function plural(value: number, singular: string, pluralValue = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralValue}`
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
  const [open, setOpen] = useState(false)
  const portionFactor = clientPortionFactor(recipe, individualPlanStyle)
  const familyServings = parseFloat(recipe.familyServings)
  const hasFamilyYield = Number.isFinite(familyServings) && familyServings > 1 && !individualPlanStyle && !recipe.portionPinned
  const selectionsSnapshot = useSyncExternalStore(
    (listener) => storageKey ? subscribeMealPrepSelections(storageKey, listener) : () => {},
    () => storageKey ? mealPrepSelectionsSnapshot(storageKey) : '',
    () => '',
  )
  const selections = useMemo(() => parseMealPrepSelections(selectionsSnapshot), [selectionsSnapshot])
  const savedSelection = occurrenceKey ? selections[occurrenceKey] : undefined
  const peopleEating = savedSelection?.peopleEating ?? 1
  const prepPortions = savedSelection?.prepPortions ?? 0
  const mealFactor = hasFamilyYield
    ? portionFactor + (Math.max(peopleEating, 1) - 1) / familyServings
    : peopleEating * portionFactor
  const prepFactor = prepPortions * portionFactor
  const totalFactor = mealFactor + prepFactor
  const lines = useMemo(() => scaledIngredientLines(recipe, totalFactor), [recipe, totalFactor])
  const totalLabel = totalFactor >= 0.995 && totalFactor <= 1.005
    ? '1x the written recipe'
    : `${Number(totalFactor.toFixed(2))}x the written recipe`

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

  const persistSelection = (nextPeopleEating: number, nextPrepPortions: number) => {
    if (!storageKey || !occurrenceKey) return
    const nextMealFactor = hasFamilyYield
      ? portionFactor + (Math.max(nextPeopleEating, 1) - 1) / familyServings
      : nextPeopleEating * portionFactor
    const nextTotalFactor = nextMealFactor + nextPrepPortions * portionFactor
    const defaultFactor = portionFactor
    const isDefault = nextPeopleEating === 1
      && nextPrepPortions === 0
      && Math.abs(nextTotalFactor - defaultFactor) < 0.0001
    writeMealPrepSelection(storageKey, occurrenceKey, isDefault
      ? null
      : { peopleEating: nextPeopleEating, prepPortions: nextPrepPortions, totalFactor: nextTotalFactor })
  }

  const setPeopleEating = (value: number) => {
    persistSelection(value, prepPortions)
  }

  const setPrepPortions = (value: number) => {
    persistSelection(peopleEating, value)
  }

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(200,220,192,0.6)' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{ ...buttonStyle(open), display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <UtensilsCrossed size={14} aria-hidden="true" />
        Meal prep
      </button>

      {open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <MealPrepStepper
            label="How many people are eating?"
            hint={hasFamilyYield ? `The written recipe serves ${familyServings}.` : 'Use 1 if it is just her.'}
            value={peopleEating}
            min={1}
            max={12}
            setValue={setPeopleEating}
          />
          <MealPrepStepper
            label="How many portions to save for her?"
            hint="Add the extra meal-prep containers she wants after this meal."
            value={prepPortions}
            min={0}
            max={7}
            setValue={setPrepPortions}
          />

          <div style={{ background: 'rgba(255,255,255,0.38)', border: '1px solid rgba(63,105,54,0.14)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Cook <strong style={{ color: 'var(--text-primary)' }}>{totalLabel}</strong>. This covers {plural(peopleEating, 'person', 'people')} eating now
              {prepPortions > 0 ? ` plus ${plural(prepPortions, 'portion')} saved for her.` : '.'}
            </p>
            {prepPortions > 0 && (
              <p style={{ ...helpText, marginTop: '0.35rem' }}>
                Her saved containers use her plan portion, so the listed calories and macros stay on track.
              </p>
            )}
            {lines.length > 0 && (
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
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · raw</span>
                      )}
                      {line.state === 'cooked' && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}> · cooked weight</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
