'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronDown, Plus, AlertCircle, X } from 'lucide-react'
import IngredientPicker from '@/components/admin/IngredientPicker'
import { parseIngredientBlock, formatGramsLine, type ParsedIngredient } from '@/lib/recipes/paste-parser'
import {
  isExcludedNutritionIngredient,
  setIngredientNutritionExcluded,
} from '@/lib/nutrition-ingredient'
import { shouldReviewEnergyDifference } from '@/lib/nutrition-math'

type LibraryRecipe = {
  id: string
  name: string
  meal_type: string
  family_servings: string
  ingredients: string[]
  instructions: string[]
  notes: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fats: number | null
  fiber: number | null
  total_recipe_grams: number | null
  created_at: string
}

const EMPTY_RECIPE = {
  name: '',
  meal_type: 'dinner',
  family_servings: '4',
  ingredients: [] as string[],
  instructions: [] as string[],
  notes: '',
  calories: null as number | null,
  protein: null as number | null,
  carbs: null as number | null,
  fats: null as number | null,
  fiber: null as number | null,
  total_recipe_grams: null as number | null,
}

const label: React.CSSProperties = {
  fontFamily: 'var(--font-hanken)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--admin-on-surface-variant)',
  display: 'block',
  marginBottom: 4,
}

// Drops leading numbering or bullets so steps pasted from any source line up
// with the editor's own numbering. Handles "1.", "1)", "Step 1:", "•", "-", "*".
function stripStepPrefix(line: string): string {
  return line
    .trim()
    .replace(/^\s*(?:step\s*)?(\d+)\s*[.):\-]\s*/i, '')
    .replace(/^[•\-*]\s+/, '')
    .trim()
}

function InstructionListEditor({
  steps,
  onChange,
}: {
  steps: string[]
  onChange: (next: string[]) => void
}) {
  // Display always shows at least one editable row so the user has a target
  // to paste/type into when the recipe is brand new.
  const displaySteps = steps.length > 0 ? steps : ['']

  function updateStep(index: number, value: string) {
    const next = [...displaySteps]
    next[index] = value
    onChange(next.filter((s, i) => s.trim() || i < next.length - 1))
  }

  function addStep() {
    onChange([...steps, ''])
  }

  function removeStep(index: number) {
    onChange(displaySteps.filter((_, i) => i !== index))
  }

  // When she pastes a multi-line blob into any single row, split it into the
  // remaining rows instead of dumping all the text into one box.
  function handlePaste(index: number, event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = event.clipboardData.getData('text')
    if (!text.includes('\n')) return
    event.preventDefault()
    const incoming = text.split('\n').map(stripStepPrefix).filter(Boolean)
    if (incoming.length === 0) return
    const next = [...displaySteps]
    next.splice(index, 1, ...incoming)
    onChange(next.filter(Boolean))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {displaySteps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--admin-surface-low)',
              color: 'var(--admin-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {i + 1}
          </span>
          <textarea
            className="admin-input"
            rows={2}
            value={step}
            onChange={(e) => updateStep(i, e.target.value)}
            onPaste={(e) => handlePaste(i, e)}
            placeholder={i === 0 ? 'First step — or paste the whole list here and it will split into rows.' : `Step ${i + 1}`}
            style={{ flex: 1, resize: 'vertical', fontFamily: 'var(--font-hanken)', fontSize: '0.86rem' }}
          />
          {(displaySteps.length > 1 || step.trim()) && (
            <button
              type="button"
              onClick={() => removeStep(i)}
              aria-label={`Remove step ${i + 1}`}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--admin-on-surface-variant)',
                padding: 6,
                marginTop: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addStep}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: '1px dashed var(--admin-outline)',
          borderRadius: 6,
          padding: '4px 10px',
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.78rem',
          color: 'var(--admin-on-surface-variant)',
          cursor: 'pointer',
        }}
      >
        <Plus size={12} /> Add step
      </button>
    </div>
  )
}

// Detects whether a recipe was built in paste-mode (any saved macro total)
// so reopening it lands the editor on the same tab she used to create it.
function detectPasteMode(draft: typeof EMPTY_RECIPE): boolean {
  return draft.calories != null || draft.protein != null || draft.carbs != null || draft.fats != null || draft.fiber != null
}

function macroNum(value: number | null): string {
  return value == null ? '' : String(value)
}

function parseMacroInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  return Number.isFinite(num) && num >= 0 ? num : null
}

type NutritionPreviewData = {
  clientServing: { calories: number; protein: number; carbs: number; fats: number; fiber: number }
  totalRecipe: { calories: number; protein: number; carbs: number; fats: number; fiber: number }
  ingredients: Array<{
    input: string
    matchedFood: string
    grams: number
    calories: number
    protein: number
    carbs: number
    fats: number
    fiber: number
  }>
  excludedIngredients: string[]
  unmatchedIngredients: string[]
  warnings: string[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

function macroLine(n: NutritionPreviewData['totalRecipe']) {
  return `${Math.round(n.calories)} cal · ${round1(n.protein)}g protein · ${round1(n.carbs)}g carbs · ${round1(n.fats)}g fats · ${round1(n.fiber)}g fiber`
}

// Read-only USDA nutrition breakdown for the library card. USDA-mode recipes
// keep their stored macro columns null (that null IS the "not paste-mode"
// signal, so these numbers must never be written onto the draft) — this
// panel is the only place the coach can see what the matched ingredients
// add up to, and which line drags the 4/4/9 energy check off.
function UsdaNutritionPreview({
  ingredients,
  familyServings,
}: {
  ingredients: string[]
  familyServings: string
}) {
  const [data, setData] = useState<NutritionPreviewData | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  // Serialized so the effect refires on content changes, not array identity.
  const requestKey = JSON.stringify({ ingredients, familyServings })
  useEffect(() => {
    // The call site only mounts this panel with a non-empty ingredient list,
    // and unmounting resets the state — no empty-list handling needed here.
    const request = JSON.parse(requestKey) as { ingredients: string[]; familyServings: string }
    if (request.ingredients.length === 0) return
    const controller = new AbortController()
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setPending(true)
      try {
        const response = await fetch('/api/admin/coaching/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({} as { nutrition?: NutritionPreviewData; error?: string }))
        if (cancelled) return
        // A 422 still carries the partial calculation — show it alongside the error.
        setData(payload.nutrition ?? null)
        setError(response.ok ? '' : payload.error || 'USDA could not calculate this recipe.')
        setPending(false)
      } catch {
        if (cancelled || controller.signal.aborted) return
        setData(null)
        setError('USDA nutrition preview failed. Check your connection and try again.')
        setPending(false)
      }
    }, 500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [requestKey])

  if (!data && !error && !pending) return null

  const servings = parseFloat(familyServings)
  const totalAtwater = data
    ? data.totalRecipe.protein * 4 + data.totalRecipe.carbs * 4 + data.totalRecipe.fats * 9
    : 0
  const reviewEnergy = data ? shouldReviewEnergyDifference(data.totalRecipe.calories, totalAtwater) : false
  const text: React.CSSProperties = { fontFamily: 'var(--font-hanken)', fontSize: '0.82rem', color: 'var(--admin-on-surface)', margin: 0 }
  const muted: React.CSSProperties = { ...text, color: 'var(--admin-on-surface-variant)' }

  return (
    <div className="admin-card" style={{ marginTop: 10, padding: '12px 14px', background: '#FAFAF6', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={label}>Calculated nutrition (USDA)</span>
        {pending && <span style={{ ...muted, fontSize: '0.75rem' }}>Calculating…</span>}
      </div>
      {error && (
        <p role="alert" style={{ ...text, color: '#B42318', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 10px' }}>
          {error}
        </p>
      )}
      {data && (
        <>
          <p style={text}><strong>Whole recipe:</strong> {macroLine(data.totalRecipe)}</p>
          {Number.isFinite(servings) && servings > 1 && (
            <p style={text}><strong>Per serving (one of {servings}):</strong> {macroLine(data.clientServing)}</p>
          )}
          {reviewEnergy && (
            <p style={{ ...text, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '8px 10px' }}>
              4/4/9 check: these macros imply ~{Math.round(totalAtwater)} cal vs. {Math.round(data.totalRecipe.calories)} from the database.
              Lines highlighted below carry most of the difference — check their USDA match.
            </p>
          )}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {data.ingredients.map((row, i) => {
              const rowAtwater = row.protein * 4 + row.carbs * 4 + row.fats * 9
              const flagged = shouldReviewEnergyDifference(row.calories, rowAtwater, 0.25, 30)
              return (
                <li
                  key={i}
                  style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 10px', padding: '5px 10px',
                    borderRadius: 6, fontFamily: 'var(--font-hanken)', fontSize: '0.8rem',
                    background: flagged ? '#FFFBEB' : 'var(--admin-surface)',
                    border: flagged ? '1px solid #FDE68A' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: 'var(--admin-on-surface)', fontWeight: 600 }}>{row.grams}g {row.matchedFood}</span>
                  <span style={{ color: 'var(--admin-on-surface-variant)' }}>
                    {Math.round(row.calories)} cal · {round1(row.protein)}P / {round1(row.carbs)}C / {round1(row.fats)}F
                  </span>
                  {flagged && (
                    <span style={{ color: '#92400E' }}>macros imply ~{Math.round(rowAtwater)} cal</span>
                  )}
                </li>
              )
            })}
          </ul>
          {data.excludedIngredients.length > 0 && (
            <p style={muted}>Excluded from nutrition: {data.excludedIngredients.join(', ')}</p>
          )}
          {data.warnings.length > 0 && data.warnings.map((warning, i) => (
            <p key={i} style={{ ...muted, fontStyle: 'italic' }}>{warning}</p>
          ))}
        </>
      )}
    </div>
  )
}

function RecipeIngredientsSection({
  draft,
  onChange,
}: {
  draft: typeof EMPTY_RECIPE
  onChange: (patch: Partial<typeof EMPTY_RECIPE>) => void
}) {
  const [mode, setMode] = useState<'usda' | 'paste' | 'url'>(detectPasteMode(draft) ? 'paste' : 'usda')
  const [pasteText, setPasteText] = useState('')
  // Parsed lines kept in local state so user can override fuzzy gram weights
  // before committing the structured ingredients back to the recipe draft.
  const [parsed, setParsed] = useState<ParsedIngredient[]>([])
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  function changeIngredients(ingredients: string[]) {
    // Ingredient edits invalidate any imported/manual whole-recipe totals.
    // The coaching calculator will rebuild all nutrients from the reviewed
    // ingredient list instead of scaling stale numbers.
    onChange({
      ingredients,
      calories: null,
      protein: null,
      carbs: null,
      fats: null,
      fiber: null,
      total_recipe_grams: null,
    })
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError('')
    try {
      const response = await fetch('/api/admin/coaching/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        setImportError(data.error || 'Could not import that recipe.')
        return
      }
      const r = data.recipe as {
        title: string
        servings: number
        ingredients: { line: string; unparsed: boolean }[]
        instructions: string[]
        sourceUrl: string
        totals: { calories: number; protein: number; carbs: number; fats: number; fiber: number; grams: number }
      }
      const patch: Partial<typeof EMPTY_RECIPE> = {
        ingredients: [...draft.ingredients, ...r.ingredients.map((i) => i.line)],
        instructions: r.instructions.length > 0 && draft.instructions.length === 0 ? r.instructions : draft.instructions,
        // Edamam returned full-recipe macros — pre-fill them so admin doesn't
        // have to recalculate. She still reviews + can edit any field.
        calories: r.totals.calories,
        protein: r.totals.protein,
        carbs: r.totals.carbs,
        fats: r.totals.fats,
        fiber: r.totals.fiber,
        total_recipe_grams: r.totals.grams,
      }
      if (!draft.name && r.title) patch.name = r.title
      if (r.servings) patch.family_servings = String(r.servings)
      if (r.sourceUrl) {
        const sourceLine = `Source: ${r.sourceUrl}`
        patch.notes = draft.notes && !draft.notes.includes(r.sourceUrl)
          ? `${draft.notes}\n\n${sourceLine}`
          : draft.notes || sourceLine
      }
      onChange(patch)
      const unparsedCount = r.ingredients.filter((i) => i.unparsed).length
      if (unparsedCount > 0) {
        setImportError(`Imported, but ${unparsedCount} ingredient${unparsedCount === 1 ? '' : 's'} couldn't be parsed. Look for lines that show "0g" and fix them before saving.`)
      } else {
        setImportUrl('')
      }
      setMode('usda')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import that recipe.')
    } finally {
      setImporting(false)
    }
  }

  function convertPasted() {
    const lines = parseIngredientBlock(pasteText)
    setParsed(lines)
  }

  function commitParsed() {
    const lines = parsed.map(formatGramsLine)
    const totalGrams = parsed.reduce((sum, p) => sum + p.grams, 0)
    onChange({
      ingredients: [...draft.ingredients, ...lines],
      calories: null,
      protein: null,
      carbs: null,
      fats: null,
      fiber: null,
      total_recipe_grams: Math.round(totalGrams * 10) / 10,
    })
    setParsed([])
    setPasteText('')
  }

  function updateParsedGrams(index: number, value: string) {
    const grams = Number(value)
    setParsed((prev) => prev.map((p, i) => (i === index ? { ...p, grams: Number.isFinite(grams) && grams >= 0 ? grams : 0, confidence: 'high' as const, reason: undefined } : p)))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={label}>Ingredients — full family recipe amounts</span>
        <div role="tablist" style={{ display: 'inline-flex', background: 'var(--admin-surface-low)', borderRadius: 8, padding: 2, gap: 2 }}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'usda'}
            onClick={() => setMode('usda')}
            style={{
              padding: '4px 12px', fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: 'pointer',
              background: mode === 'usda' ? '#FFFFFF' : 'transparent',
              color: mode === 'usda' ? 'var(--admin-on-surface)' : 'var(--admin-on-surface-variant)',
              boxShadow: mode === 'usda' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            USDA picker
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'paste'}
            onClick={() => setMode('paste')}
            style={{
              padding: '4px 12px', fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: 'pointer',
              background: mode === 'paste' ? '#FFFFFF' : 'transparent',
              color: mode === 'paste' ? 'var(--admin-on-surface)' : 'var(--admin-on-surface-variant)',
              boxShadow: mode === 'paste' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Paste recipe
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'url'}
            onClick={() => setMode('url')}
            style={{
              padding: '4px 12px', fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: 'pointer',
              background: mode === 'url' ? '#FFFFFF' : 'transparent',
              color: mode === 'url' ? 'var(--admin-on-surface)' : 'var(--admin-on-surface-variant)',
              boxShadow: mode === 'url' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Import URL
          </button>
        </div>
      </div>

      {mode === 'usda' ? (
        <div style={{ marginTop: 6 }}>
          <IngredientPicker onAdd={(ing) => changeIngredients([...draft.ingredients, ing])} />
        </div>
      ) : mode === 'url' ? (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8rem', color: 'var(--admin-on-surface-variant)', margin: 0 }}>
            Paste a recipe URL (NYT Cooking, AllRecipes, blog posts, etc.). We pull title, servings, ingredients with USDA-matched grams, and instructions — review every line before saving.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="admin-input"
              type="url"
              placeholder="https://cooking.nytimes.com/recipes/..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); importFromUrl() } }}
              disabled={importing}
              style={{ flex: 1, fontFamily: 'var(--font-hanken)', fontSize: '0.86rem' }}
            />
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={importing || !importUrl.trim()}
              onClick={importFromUrl}
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
          {importError && (
            <p role="alert" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8rem', color: '#B42318', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 10px', margin: 0 }}>
              {importError}
            </p>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            className="admin-input"
            rows={6}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Paste the ingredients block, one per line. Example:\n1 pound cavatelli\n3 tsp olive oil\n2 cloves garlic, sliced`}
            style={{ resize: 'vertical', fontFamily: 'var(--font-hanken)', fontSize: '0.86rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={!pasteText.trim()}
              onClick={convertPasted}
            >
              Convert to grams
            </button>
          </div>

          {parsed.length > 0 && (
            <div className="admin-card" style={{ padding: '12px 14px', background: '#FAFAF6' }}>
              <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', color: 'var(--admin-on-surface-variant)', margin: '0 0 8px' }}>
                Review converted lines — fix any flagged in red, then add them all.
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {parsed.map((p, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      background: 'var(--admin-surface)', borderRadius: 7,
                      fontFamily: 'var(--font-hanken)', fontSize: '0.84rem',
                      border: p.confidence === 'fuzzy' ? '1px solid #ef9a9a' : '1px solid transparent',
                    }}
                  >
                    {p.confidence === 'fuzzy' ? (
                      <AlertCircle size={14} style={{ color: '#c62828', flexShrink: 0 }} aria-label="Needs review" />
                    ) : (
                      <span style={{ color: '#2e7d32', fontSize: '0.7rem' }}>✓</span>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={p.grams || ''}
                      onChange={(e) => updateParsedGrams(i, e.target.value)}
                      style={{ width: 64, padding: '2px 6px', border: '1px solid var(--admin-outline)', borderRadius: 4, fontFamily: 'inherit', fontSize: '0.82rem' }}
                      aria-label="Grams"
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--admin-on-surface-variant)' }}>g</span>
                    <span style={{ flex: 1, color: 'var(--admin-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.raw}>
                      {p.name || p.raw}
                    </span>
                    {p.reason && (
                      <span style={{ fontSize: '0.72rem', color: '#c62828', fontStyle: 'italic' }} title={p.reason}>
                        {p.reason.length > 40 ? p.reason.slice(0, 40) + '…' : p.reason}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="admin-btn-ghost" onClick={() => setParsed([])}>
                  Cancel
                </button>
                <button type="button" className="admin-btn-primary" onClick={commitParsed} style={{ background: '#C9A84C', color: '#162814', border: 'none', fontWeight: 700 }}>
                  Add {parsed.length} ingredient{parsed.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <label>
              <span style={label}>Calories (whole recipe)</span>
              <input
                className="admin-input"
                type="number"
                min="0"
                step="any"
                value={macroNum(draft.calories)}
                onChange={(e) => onChange({ calories: parseMacroInput(e.target.value) })}
                placeholder="1800"
              />
            </label>
            <label>
              <span style={label}>Protein (g)</span>
              <input
                className="admin-input"
                type="number"
                min="0"
                step="any"
                value={macroNum(draft.protein)}
                onChange={(e) => onChange({ protein: parseMacroInput(e.target.value) })}
                placeholder="120"
              />
            </label>
            <label>
              <span style={label}>Carbs (g)</span>
              <input
                className="admin-input"
                type="number"
                min="0"
                step="any"
                value={macroNum(draft.carbs)}
                onChange={(e) => onChange({ carbs: parseMacroInput(e.target.value) })}
                placeholder="180"
              />
            </label>
            <label>
              <span style={label}>Fats (g)</span>
              <input
                className="admin-input"
                type="number"
                min="0"
                step="any"
                value={macroNum(draft.fats)}
                onChange={(e) => onChange({ fats: parseMacroInput(e.target.value) })}
                placeholder="60"
              />
            </label>
            <label>
              <span style={label}>Fiber (g)</span>
              <input
                className="admin-input"
                type="number"
                min="0"
                step="any"
                value={macroNum(draft.fiber)}
                onChange={(e) => onChange({ fiber: parseMacroInput(e.target.value) })}
                placeholder="18"
              />
            </label>
          </div>
        </div>
      )}

      {draft.ingredients.length > 0 && (
        <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {draft.ingredients.map((ing, i) => {
            const display = ing.replace(/^\[(?:fdc:\d+|curated:[a-z0-9-]+)\]\s*/i, '')
            const excluded = isExcludedNutritionIngredient(ing)
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--admin-surface-low)', borderRadius: 7, fontFamily: 'var(--font-hanken)', fontSize: '0.84rem' }}>
                <span style={{ color: excluded ? '#9a3412' : '#2e7d32', fontSize: '0.7rem' }}>{excluded ? '—' : '✓'}</span>
                <span style={{ flex: 1, color: 'var(--admin-on-surface-variant)' }}>{display}</span>
                <button
                  type="button"
                  onClick={() => changeIngredients(draft.ingredients.map((line, j) => (
                    j === i ? setIngredientNutritionExcluded(line, !excluded) : line
                  )))}
                  style={{
                    background: excluded ? '#fff7ed' : 'none',
                    border: '1px solid var(--admin-outline-variant)',
                    borderRadius: 5,
                    cursor: 'pointer',
                    color: excluded ? '#9a3412' : 'var(--admin-on-surface-variant)',
                    padding: '2px 7px',
                    fontFamily: 'inherit',
                    fontSize: '0.72rem',
                  }}
                >
                  {excluded ? 'Include in nutrition' : 'Exclude from nutrition'}
                </button>
                <button
                  type="button"
                  onClick={() => changeIngredients(draft.ingredients.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)', padding: '0 4px', fontSize: '1rem' }}
                  aria-label="Remove"
                >×</button>
              </li>
            )
          })}
        </ul>
      )}
      {mode === 'usda' && draft.ingredients.length > 0 && (
        <UsdaNutritionPreview ingredients={draft.ingredients} familyServings={draft.family_servings} />
      )}
    </div>
  )
}

// Module-scope component: defining this inside the page remounts the whole
// form on every keystroke, dropping input focus while typing.
function RecipeForm({
  draft,
  onChange,
  onSave,
  saving: isSaving,
  isNew,
  onCancel,
}: {
  draft: typeof EMPTY_RECIPE
  onChange: (patch: Partial<typeof EMPTY_RECIPE>) => void
  onSave: () => void
  saving: boolean
  isNew?: boolean
  onCancel?: () => void
}) {
  return (
    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
        <label>
          <span style={label}>Recipe Name</span>
          <input className="admin-input" value={draft.name} onChange={e => onChange({ name: e.target.value })} placeholder="e.g. Sheet Pan Chicken Thighs" />
        </label>
        <label>
          <span style={label}>Meal Type</span>
          <select className="admin-input" value={draft.meal_type} onChange={e => onChange({ meal_type: e.target.value })}>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </label>
        <label>
          <span style={label}>Family Servings</span>
          <input className="admin-input" type="number" min="1" value={draft.family_servings} onChange={e => onChange({ family_servings: e.target.value })} placeholder="4" />
        </label>
      </div>

      <RecipeIngredientsSection draft={draft} onChange={onChange} />

      <details>
        <summary style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', color: 'var(--admin-on-surface-variant)', cursor: 'pointer', userSelect: 'none' }}>
          Instructions &amp; Notes (optional)
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
          <div>
            <span style={label}>Instructions</span>
            <InstructionListEditor
              steps={draft.instructions}
              onChange={(steps) => onChange({ instructions: steps })}
            />
          </div>
          <label>
            <span style={label}>Notes</span>
            <textarea
              className="admin-input"
              rows={4}
              value={draft.notes}
              onChange={e => onChange({ notes: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </label>
        </div>
      </details>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {isNew && onCancel && (
          <button type="button" className="admin-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="admin-btn-primary"
          disabled={isSaving || !draft.name.trim()}
          onClick={onSave}
          style={{ background: '#C9A84C', color: '#162814', border: 'none', fontWeight: 700 }}
        >
          {isSaving ? 'Saving…' : isNew ? 'Add to Library' : 'Save Recipe'}
        </button>
      </div>
    </div>
  )
}

export default function RecipeLibraryPage() {
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [drafts, setDrafts] = useState<Record<string, typeof EMPTY_RECIPE>>({})
  const [newRecipe, setNewRecipe] = useState({ ...EMPTY_RECIPE })
  const [addingNew, setAddingNew] = useState(false)
  const [newSaving, setNewSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/recipes')
      const data = await res.json()
      setRecipes(data.recipes ?? [])
      const initial: Record<string, typeof EMPTY_RECIPE> = {}
      for (const r of (data.recipes ?? [])) {
        initial[r.id] = {
          name: r.name,
          meal_type: r.meal_type,
          family_servings: r.family_servings,
          ingredients: r.ingredients,
          instructions: r.instructions,
          notes: r.notes,
          calories: r.calories ?? null,
          protein: r.protein ?? null,
          carbs: r.carbs ?? null,
          fats: r.fats ?? null,
          fiber: r.fiber ?? null,
          total_recipe_grams: r.total_recipe_grams ?? null,
        }
      }
      setDrafts(initial)
    } catch {
      setError('Failed to load recipes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function updateDraft(id: string, patch: Partial<typeof EMPTY_RECIPE>) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  // e.g. "2 client plans using this recipe were re-synced automatically."
  function resyncNotice(resync: { affected: number; updated: number; failed: { clientId: string; error: string }[] } | undefined) {
    if (!resync || resync.affected === 0) return ''
    const plans = (n: number) => `${n} client plan${n === 1 ? '' : 's'}`
    if (resync.failed.length > 0) {
      return `Saved. ${plans(resync.updated)} re-synced, but ${plans(resync.failed.length)} could not re-sync — open that client's plan, fix the flagged recipe, and save.`
    }
    return `Saved. ${plans(resync.updated)} using this recipe ${resync.updated === 1 ? 'was' : 'were'} re-synced automatically — portions and grocery lists are already updated.`
  }

  async function saveRecipe(id: string) {
    setSaving(id)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/admin/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drafts[id]),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRecipes(prev => prev.map(r => r.id === id ? data.recipe : r))
      setNotice(resyncNotice(data.resync))
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  async function deleteRecipe(id: string) {
    if (!confirm('Delete this recipe? This cannot be undone.')) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/recipes/${id}`, { method: 'DELETE' })
      setRecipes(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Failed to delete.')
    } finally {
      setDeleting(null)
    }
  }

  async function createRecipe() {
    if (!newRecipe.name.trim()) return
    setNewSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNotice(resyncNotice(data.resync))
      setRecipes(prev => [data.recipe, ...prev])
      setDrafts(prev => ({
        ...prev,
        [data.recipe.id]: {
          name: data.recipe.name,
          meal_type: data.recipe.meal_type,
          family_servings: data.recipe.family_servings,
          ingredients: data.recipe.ingredients,
          instructions: data.recipe.instructions,
          notes: data.recipe.notes,
          calories: data.recipe.calories ?? null,
          protein: data.recipe.protein ?? null,
          carbs: data.recipe.carbs ?? null,
          fats: data.recipe.fats ?? null,
          fiber: data.recipe.fiber ?? null,
          total_recipe_grams: data.recipe.total_recipe_grams ?? null,
        },
      }))
      setNewRecipe({ ...EMPTY_RECIPE })
      setAddingNew(false)
    } catch {
      setError('Failed to create recipe.')
    } finally {
      setNewSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '2rem', fontWeight: 700, color: 'var(--admin-on-surface)', margin: 0 }}>
            Recipe Library
          </h1>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Your global recipe database — available in all client meal plans.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn-primary"
          style={{ background: '#C9A84C', color: '#162814', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setAddingNew(true)}
        >
          <Plus size={15} /> New Recipe
        </button>
      </div>

      {error && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, background: '#fef2f2', border: '1px solid #fca5a5' }}>
          <p style={{ fontFamily: 'var(--font-hanken)', color: '#b91c1c', fontSize: '0.88rem', margin: 0 }}>{error}</p>
        </div>
      )}

      {notice && (
        <div className="admin-card" role="status" style={{ padding: '12px 16px', marginBottom: 16, background: '#f0f7ee', border: '1px solid #b6cfae' }}>
          <p style={{ fontFamily: 'var(--font-hanken)', color: '#2e5a28', fontSize: '0.88rem', margin: 0 }}>{notice}</p>
        </div>
      )}

      {addingNew && (
        <div className="admin-card" style={{ marginBottom: 16, border: '2px solid #C9A84C' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--admin-outline-variant)', background: '#FFFEF9' }}>
            <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-on-surface)', margin: 0 }}>
              New Recipe
            </p>
          </div>
          <RecipeForm
            draft={newRecipe}
            onChange={patch => setNewRecipe(prev => ({ ...prev, ...patch }))}
            onSave={createRecipe}
            saving={newSaving}
            isNew
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', textAlign: 'center', padding: '40px 0' }}>
          Loading recipes…
        </p>
      ) : recipes.length === 0 ? (
        <div className="admin-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.5rem', color: 'var(--admin-on-surface)', margin: '0 0 8px' }}>No recipes yet</p>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', fontSize: '0.9rem', margin: 0 }}>
            Click &quot;New Recipe&quot; to add your first recipe to the library.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recipes.map(recipe => {
            const draft = drafts[recipe.id]
            if (!draft) return null
            return (
              <details key={recipe.id} className="admin-card" style={{ overflow: 'hidden' }}>
                <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', background: 'var(--admin-surface-low)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-on-surface)' }}>
                        {draft.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', marginTop: 2, textTransform: 'capitalize' }}>
                        {draft.meal_type} · Serves {draft.family_servings} · {draft.ingredients.length} ingredient{draft.ingredients.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="admin-btn-ghost"
                      style={{ color: 'var(--admin-error)', fontSize: '0.78rem', padding: '4px 8px' }}
                      disabled={deleting === recipe.id}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); deleteRecipe(recipe.id) }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronDown size={15} style={{ color: 'var(--admin-on-surface-variant)' }} />
                  </div>
                </summary>
                <div style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
                  <RecipeForm
                    draft={draft}
                    onChange={patch => updateDraft(recipe.id, patch)}
                    onSave={() => saveRecipe(recipe.id)}
                    saving={saving === recipe.id}
                  />
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
