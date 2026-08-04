'use client'

import { useMemo, useSyncExternalStore } from 'react'
import GroceryChecklist from '@/components/coaching/GroceryChecklist'
import { buildGroceryList, clientGroceryList } from '@/lib/grocery-list'
import { groceryDisplay } from '@/lib/household-measure'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import {
  mealPrepSelectionsSnapshot,
  parseMealPrepSelections,
  subscribeMealPrepSelections,
} from '@/components/coaching/mealPrepSelectionStore'

export default function DynamicGroceryChecklist({
  plan,
  storageKey,
  mealPrepStorageKey,
  includeStaples = true,
}: {
  plan: CoachingPlanDraft
  storageKey: string
  mealPrepStorageKey: string
  includeStaples?: boolean
}) {
  const selectionsSnapshot = useSyncExternalStore(
    (listener) => subscribeMealPrepSelections(mealPrepStorageKey, listener),
    () => mealPrepSelectionsSnapshot(mealPrepStorageKey),
    () => '',
  )
  const selections = useMemo(() => parseMealPrepSelections(selectionsSnapshot), [selectionsSnapshot])

  const items = useMemo(() => {
    const portionOverrides = Object.fromEntries(
      Object.entries(selections)
        .filter(([, selection]) => Number.isFinite(selection.totalFactor) && selection.totalFactor > 0)
        .map(([key, selection]) => [key, selection.totalFactor]),
    )
    const options = { clientPortionsOnly: true, portionOverrides }
    const lines = includeStaples
      ? clientGroceryList(plan, options)
      : buildGroceryList(plan, options)
    return lines.map((item) => groceryDisplay(item))
  }, [includeStaples, plan, selections])

  return <GroceryChecklist items={items} storageKey={storageKey} />
}
