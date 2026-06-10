'use client'

import { useEffect, useRef, useState } from 'react'

type UsdaFoodMeasure = {
  label: string
  grams: number
}

type UsdaFoodOption = {
  fdcId: number
  description: string
  dataType: string
  brand: string
  calories: number
  protein: number
  carbs: number
  fats: number
  measures?: UsdaFoodMeasure[]
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
  const [amount, setAmount] = useState('')
  const [measureIdx, setMeasureIdx] = useState(-1)
  const [open, setOpen] = useState(false)
  // Ancestor cards use overflow:hidden for rounded corners, which clips an
  // absolutely-positioned list — so the dropdown is fixed to the viewport
  // and anchored to the input's measured position instead.
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const gramsRef = useRef<HTMLInputElement>(null)
  const selectedFdcRef = useRef<number | null>(null)
  const amountRef = useRef('')
  const debouncedQuery = useDebounce(query, 350)

  useEffect(() => {
    if (!open) return
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) setAnchor({ top: rect.bottom, left: rect.left, width: rect.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

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

  function applyDefaultUnit(food: UsdaFoodOption) {
    // Count-style measures ("1 large", "1 medium") default to counting;
    // weighed foods (egg whites, chicken, rice) default to grams.
    const weighedFood = /egg,?\s*white|liquid egg/i.test(food.description)
    const countMeasure = weighedFood
      ? -1
      : (food.measures ?? []).findIndex((m) => /^1\s+(large|medium|small|extra large|jumbo|slice|piece|egg|banana|apple)\b/i.test(m.label))
    setMeasureIdx(countMeasure)
    const defaultAmount = countMeasure >= 0 ? '1' : ''
    setAmount(defaultAmount)
    amountRef.current = defaultAmount
  }

  function selectFood(food: UsdaFoodOption) {
    selectedFdcRef.current = food.fdcId
    setSelected(food)
    setQuery(food.description)
    setOpen(false)
    applyDefaultUnit(food)

    // Search results rarely include household measures — fetch them for this food.
    if ((food.measures ?? []).length === 0) {
      fetch(`/api/admin/coaching/usda-search?fdcId=${food.fdcId}`)
        .then((r) => r.json())
        .then((data: { measures?: UsdaFoodMeasure[] }) => {
          const measures = data.measures ?? []
          if (measures.length === 0 || selectedFdcRef.current !== food.fdcId) return
          const withMeasures = { ...food, measures }
          setSelected(withMeasures)
          // Don't disturb anything she already typed while measures loaded.
          if (!amountRef.current.trim()) applyDefaultUnit(withMeasures)
        })
        .catch(() => {})
    }

    setTimeout(() => gramsRef.current?.focus(), 50)
  }

  const activeMeasure = selected && measureIdx >= 0 ? (selected.measures ?? [])[measureIdx] ?? null : null
  const amountNum = parseFloat(amount)
  const validAmount = Number.isFinite(amountNum) && amountNum > 0
  const totalGrams = validAmount
    ? Math.round((activeMeasure ? amountNum * activeMeasure.grams : amountNum) * 10) / 10
    : null

  function addIngredient() {
    if (!selected || totalGrams === null) return
    // Keep the human count in the label; the math always runs on grams.
    const countText = activeMeasure
      ? ` (${/^1\s+/.test(activeMeasure.label) ? `${amountNum} ${activeMeasure.label.replace(/^1\s+/, '')}` : `${amountNum} × ${activeMeasure.label}`})`
      : ''
    const ingredient = `[fdc:${selected.fdcId}] ${totalGrams}g ${selected.description}${countText}${selected.brand ? ` (${selected.brand})` : ''}`
    onAdd(ingredient)
    setQuery('')
    setSelected(null)
    selectedFdcRef.current = null
    setAmount('')
    amountRef.current = ''
    setMeasureIdx(-1)
    setResults([])
  }

  const cal = selected && totalGrams !== null ? Math.round(selected.calories * totalGrams / 100) : null

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div ref={anchorRef} style={{ position: 'relative' }}>
        <input
          className="admin-input"
          placeholder="Search USDA foods, e.g. chicken breast cooked…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); selectedFdcRef.current = null }}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)' }}>
            Searching…
          </span>
        )}
        {open && anchor && results.length > 0 && (
          <ul style={{
            position: 'fixed', top: anchor.top + 2, left: anchor.left, width: anchor.width, zIndex: 1000,
            backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-outline)',
            borderRadius: 8, margin: 0, padding: 0, listStyle: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: Math.min(320, window.innerHeight - anchor.top - 16), overflowY: 'auto',
          }}>
            {results.map((food, idx) => {
              const dataTypeLabel =
                food.dataType === 'Foundation' ? 'Foundation'
                : food.dataType === 'SR Legacy' ? 'SR Legacy'
                : food.dataType === 'Survey (FNDDS)' ? 'Survey'
                : food.dataType === 'Branded' ? 'Brand label'
                : food.dataType || 'USDA'
              return (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-on-surface)', margin: 0 }}>
                        {food.description}
                        {food.brand && (
                          <span style={{ fontWeight: 400, color: 'var(--admin-on-surface-variant)' }}> — {food.brand}</span>
                        )}
                      </p>
                      {/* USDA verified checkmark */}
                      <span title="USDA FoodData Central verified" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', backgroundColor: '#2e7d32', flexShrink: 0 }}>
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {idx === 0 && (
                        <span style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.68rem', fontWeight: 600, color: '#1a56a0', backgroundColor: '#e8f0fe', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.02em' }}>
                          Best Match
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', margin: '2px 0 0' }}>
                      per 100g — {food.calories} cal · {food.protein}g protein · {food.carbs}g carbs · {food.fats}g fat
                      <span style={{ marginLeft: 6, opacity: 0.55 }}>· {dataTypeLabel}</span>
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {open && anchor && !loading && results.length === 0 && debouncedQuery.length >= 2 && (
          <div style={{
            position: 'fixed', top: anchor.top + 2, left: anchor.left, width: anchor.width, zIndex: 1000,
            backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-outline)',
            borderRadius: 8, padding: '0.75rem 0.9rem',
            fontFamily: 'var(--font-hanken)', fontSize: '0.85rem', color: 'var(--admin-on-surface-variant)',
          }}>
            No USDA results for "{debouncedQuery}". Try a simpler term like "chicken breast" or "white rice".
          </div>
        )}
      </div>

      {selected && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: '0 0 80px' }}>
            <span className="admin-label">{activeMeasure ? 'How many' : 'Grams'}</span>
            <input
              ref={gramsRef}
              className="admin-input"
              type="number"
              min="0"
              step="any"
              placeholder={activeMeasure ? 'e.g. 2' : 'e.g. 150'}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); amountRef.current = e.target.value }}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
            />
          </label>
          {(selected.measures ?? []).length > 0 && (
            <label style={{ flex: '1 1 130px', minWidth: 0 }}>
              <span className="admin-label">Unit</span>
              <select
                className="admin-input"
                value={measureIdx}
                onChange={(e) => setMeasureIdx(Number(e.target.value))}
              >
                <option value={-1}>grams</option>
                {(selected.measures ?? []).map((m, i) => (
                  <option key={i} value={i}>{m.label} ({m.grams}g)</option>
                ))}
              </select>
            </label>
          )}
          {cal !== null && totalGrams !== null && (
            <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.82rem', color: 'var(--admin-on-surface-variant)', marginBottom: 8, whiteSpace: 'nowrap' }}>
              = {totalGrams}g · ≈ {cal} cal
            </p>
          )}
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ marginBottom: 1 }}
            disabled={totalGrams === null}
            onClick={addIngredient}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
