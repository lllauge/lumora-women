'use client'

import { useMemo, useSyncExternalStore } from 'react'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import {
  mealPrepSelectionsSnapshot,
  parseMealPrepSelections,
  subscribeMealPrepSelections,
} from '@/components/coaching/mealPrepSelectionStore'

export default function SavedCookingChoiceBadge({
  recipe,
  storageKey,
  occurrenceKey,
}: {
  recipe: CoachingPlanDraft['recipes'][number]
  storageKey?: string
  occurrenceKey?: string
}) {
  const snapshot = useSyncExternalStore(
    (listener) => storageKey ? subscribeMealPrepSelections(storageKey, listener) : () => {},
    () => storageKey ? mealPrepSelectionsSnapshot(storageKey) : '',
    () => '',
  )
  const selections = useMemo(() => parseMealPrepSelections(snapshot), [snapshot])
  if (!occurrenceKey) return null
  const selection = selections[occurrenceKey]
  if (!selection) return null

  const isFamily = selection.mode === 'family'
    || (!selection.mode && (selection.peopleEating ?? 0) > 1)
  const originalServings = Math.max(2, Math.round(parseFloat(recipe.familyServings) || 4))
  const label = isFamily
    ? `Family meal · ${Math.max(2, Math.round(selection.familyPeople ?? selection.peopleEating ?? originalServings))} people`
    : `Meal prep · ${Math.max(2, Math.round(selection.portions ?? ((selection.prepPortions ?? 1) + 1)))} portions`

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', marginTop: '0.3rem', padding: '0.2rem 0.5rem',
      borderRadius: '999px', background: 'rgba(63,105,54,0.1)',
      fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 700, color: '#3F6936',
    }}>
      {label}
    </span>
  )
}
