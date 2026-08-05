'use client'

export type MealPrepSelection = {
  mode?: 'meal-prep' | 'family'
  portions?: number
  familyPeople?: number
  /** Legacy fields retained so existing local selections remain readable. */
  peopleEating?: number
  prepPortions?: number
  totalFactor: number
}

export type MealPrepSelections = Record<string, MealPrepSelection>

const EVENT_NAME = 'lumora-meal-prep-change'

export function parseMealPrepSelections(value: string | null): MealPrepSelections {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as MealPrepSelections
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readMealPrepSelections(storageKey: string): MealPrepSelections {
  if (typeof window === 'undefined') return {}
  return parseMealPrepSelections(window.localStorage.getItem(storageKey))
}

export function mealPrepSelectionsSnapshot(storageKey: string): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(storageKey) ?? ''
}

export function writeMealPrepSelection(
  storageKey: string,
  occurrenceKey: string,
  selection: MealPrepSelection | null,
) {
  const current = readMealPrepSelections(storageKey)
  if (selection) {
    current[occurrenceKey] = selection
  } else {
    delete current[occurrenceKey]
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(current))
  } catch { /* selections still work for the current render */ }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { storageKey } }))
}

export function subscribeMealPrepSelections(storageKey: string, listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) listener()
  }
  const onCustom = (event: Event) => {
    if ((event as CustomEvent<{ storageKey?: string }>).detail?.storageKey === storageKey) listener()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(EVENT_NAME, onCustom)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(EVENT_NAME, onCustom)
  }
}
