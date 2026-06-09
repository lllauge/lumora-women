'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronDown, Plus } from 'lucide-react'
import IngredientPicker from '@/components/admin/IngredientPicker'

type LibraryRecipe = {
  id: string
  name: string
  meal_type: string
  family_servings: string
  ingredients: string[]
  instructions: string[]
  notes: string
  created_at: string
}

const EMPTY_RECIPE = {
  name: '',
  meal_type: 'dinner',
  family_servings: '4',
  ingredients: [] as string[],
  instructions: [] as string[],
  notes: '',
}

function joinLines(arr: string[]) { return arr.join('\n') }
function splitLines(s: string) { return s.split('\n').map(l => l.trim()).filter(Boolean) }

export default function RecipeLibraryPage() {
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
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

  async function saveRecipe(id: string) {
    setSaving(id)
    setError('')
    try {
      const res = await fetch(`/api/admin/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drafts[id]),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRecipes(prev => prev.map(r => r.id === id ? data.recipe : r))
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

  function RecipeForm({
    draft,
    onChange,
    onSave,
    saving: isSaving,
    isNew,
  }: {
    draft: typeof EMPTY_RECIPE
    onChange: (patch: Partial<typeof EMPTY_RECIPE>) => void
    onSave: () => void
    saving: boolean
    isNew?: boolean
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

        <div>
          <span style={label}>Ingredients — full family recipe amounts</span>
          <div style={{ marginTop: 6 }}>
            <IngredientPicker
              onAdd={ing => onChange({ ingredients: [...draft.ingredients, ing] })}
            />
          </div>
          {draft.ingredients.length > 0 && (
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {draft.ingredients.map((ing, i) => {
                const display = ing.replace(/^\[fdc:\d+\]\s*/, '')
                return (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--admin-surface-low)', borderRadius: 7, fontFamily: 'var(--font-hanken)', fontSize: '0.84rem' }}>
                    <span style={{ color: '#2e7d32', fontSize: '0.7rem' }}>✓</span>
                    <span style={{ flex: 1, color: 'var(--admin-on-surface-variant)' }}>{display}</span>
                    <button
                      type="button"
                      onClick={() => onChange({ ingredients: draft.ingredients.filter((_, j) => j !== i) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)', padding: '0 4px', fontSize: '1rem' }}
                      aria-label="Remove"
                    >×</button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <details>
          <summary style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', color: 'var(--admin-on-surface-variant)', cursor: 'pointer', userSelect: 'none' }}>
            Instructions &amp; Notes (optional)
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
            <label>
              <span style={label}>Instructions (one per line)</span>
              <textarea
                className="admin-input"
                rows={4}
                value={joinLines(draft.instructions)}
                onChange={e => onChange({ instructions: splitLines(e.target.value) })}
                style={{ resize: 'vertical' }}
              />
            </label>
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
          {isNew && (
            <button type="button" className="admin-btn-ghost" onClick={() => setAddingNew(false)}>
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
