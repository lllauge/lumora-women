'use client'

import { useEffect, useRef, useState } from 'react'

type UsdaFoodOption = {
  fdcId: number
  description: string
  dataType: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

type Props = {
  onAdd: (ingredient: string) => void
}

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

export default function IngredientPicker({ onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UsdaFoodOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<UsdaFoodOption | null>(null)
  const [grams, setGrams] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const gramsRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 350)

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    fetch(`/api/admin/coaching/usda-search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: { results?: UsdaFoodOption[] }) => {
        setResults(data.results ?? [])
        setOpen(true)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectFood(food: UsdaFoodOption) {
    setSelected(food)
    setQuery(food.description)
    setOpen(false)
    setGrams('')
    setTimeout(() => gramsRef.current?.focus(), 50)
  }

  function addIngredient() {
    if (!selected || !grams.trim()) return
    const g = parseFloat(grams)
    if (!Number.isFinite(g) || g <= 0) return
    const ingredient = `[fdc:${selected.fdcId}] ${g}g ${selected.description}`
    onAdd(ingredient)
    setQuery('')
    setSelected(null)
    setGrams('')
    setResults([])
  }

  const cal = selected && grams ? Math.round(selected.calories * parseFloat(grams) / 100) : null
  const validGrams = grams && parseFloat(grams) > 0

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <input
          className="admin-input"
          placeholder="Search USDA foods, e.g. chicken breast cooked…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)' }}>
            Searching…
          </span>
        )}
        {open && results.length > 0 && (
          <ul style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-outline)',
            borderRadius: 8, marginTop: 2, padding: 0, listStyle: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 320, overflowY: 'auto',
          }}>
            {results.map((food) => (
              <li key={food.fdcId}>
                <button
                  type="button"
                  onClick={() => selectFood(food)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.6rem 0.9rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid var(--admin-outline-variant)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF8F3')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-on-surface)', margin: 0 }}>
                    {food.description}
                  </p>
                  <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', margin: '2px 0 0' }}>
                    per 100g — {food.calories} cal · {food.protein}g protein · {food.carbs}g carbs · {food.fats}g fat
                    {food.dataType && <span style={{ marginLeft: 6, opacity: 0.6 }}>({food.dataType})</span>}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && !loading && results.length === 0 && debouncedQuery.length >= 2 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-outline)',
            borderRadius: 8, marginTop: 2, padding: '0.75rem 0.9rem',
            fontFamily: 'var(--font-hanken)', fontSize: '0.85rem', color: 'var(--admin-on-surface-variant)',
          }}>
            No USDA results for "{debouncedQuery}". Try a simpler term like "chicken breast" or "white rice".
          </div>
        )}
      </div>

      {selected && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <label style={{ flex: '0 0 140px' }}>
            <span className="admin-label">Grams for this client</span>
            <input
              ref={gramsRef}
              className="admin-input"
              type="number"
              min="1"
              placeholder="e.g. 150"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
            />
          </label>
          {cal !== null && validGrams && (
            <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.82rem', color: 'var(--admin-on-surface-variant)', marginBottom: 8 }}>
              ≈ {cal} cal for {grams}g
            </p>
          )}
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ marginBottom: 1 }}
            disabled={!validGrams}
            onClick={addIngredient}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
