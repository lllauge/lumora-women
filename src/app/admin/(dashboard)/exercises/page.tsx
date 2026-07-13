'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Trash2, ChevronDown, Plus, Star, Search, Video } from 'lucide-react'
import type { LumoraExerciseDraft, YMoveExercise } from '@/lib/ymove-exercises'

type LibraryExercise = {
  id: string
  name: string
  movement_pattern: string
  primary_muscles: string[]
  equipment: string
  difficulty: string
  default_sets: string
  default_reps: string
  default_rest: string
  cues: string
  video_url: string
  female_recomp_priority: number
  archived: boolean
  created_at: string
}

const EMPTY_EXERCISE = {
  name: '',
  movement_pattern: 'accessory',
  primary_muscles: [] as string[],
  equipment: 'bodyweight',
  difficulty: 'beginner',
  default_sets: '3',
  default_reps: '10',
  default_rest: '60s',
  cues: '',
  video_url: '',
  female_recomp_priority: 0,
  archived: false,
}

type YMoveSearchResult = YMoveExercise & {
  lumoraDraft: LumoraExerciseDraft
}

const MOVEMENT_PATTERNS = [
  'squat', 'hinge', 'lunge', 'push_horizontal', 'push_vertical',
  'pull_horizontal', 'pull_vertical', 'core', 'carry', 'glute',
  'mobility', 'cardio_steady', 'cardio_intervals', 'accessory',
]

const EQUIPMENT = [
  'bodyweight', 'dumbbells', 'barbell', 'bands', 'kettlebell',
  'cable', 'machine', 'treadmill', 'bike', 'rower', 'full_gym',
]

const DIFFICULTY = ['beginner', 'intermediate', 'advanced']

function patternLabel(p: string) {
  return p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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

function ExerciseForm({
  draft,
  onChange,
  onSave,
  saving: isSaving,
  isNew,
  onCancel,
}: {
  draft: typeof EMPTY_EXERCISE
  onChange: (patch: Partial<typeof EMPTY_EXERCISE>) => void
  onSave: () => void
  saving: boolean
  isNew?: boolean
  onCancel?: () => void
}) {
  return (
    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
        <label>
          <span style={label}>Exercise Name</span>
          <input className="admin-input" value={draft.name} onChange={e => onChange({ name: e.target.value })} placeholder="e.g. Romanian Deadlift" />
        </label>
        <label>
          <span style={label}>Movement Pattern</span>
          <select className="admin-input" value={draft.movement_pattern} onChange={e => onChange({ movement_pattern: e.target.value })}>
            {MOVEMENT_PATTERNS.map(p => <option key={p} value={p}>{patternLabel(p)}</option>)}
          </select>
        </label>
        <label>
          <span style={label}>Equipment</span>
          <select className="admin-input" value={draft.equipment} onChange={e => onChange({ equipment: e.target.value })}>
            {EQUIPMENT.map(e => <option key={e} value={e}>{patternLabel(e)}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
        <label>
          <span style={label}>Difficulty</span>
          <select className="admin-input" value={draft.difficulty} onChange={e => onChange({ difficulty: e.target.value })}>
            {DIFFICULTY.map(d => <option key={d} value={d}>{patternLabel(d)}</option>)}
          </select>
        </label>
        <label>
          <span style={label}>Sets</span>
          <input className="admin-input" value={draft.default_sets} onChange={e => onChange({ default_sets: e.target.value })} placeholder="3" />
        </label>
        <label>
          <span style={label}>Reps</span>
          <input className="admin-input" value={draft.default_reps} onChange={e => onChange({ default_reps: e.target.value })} placeholder="10" />
        </label>
        <label>
          <span style={label}>Rest</span>
          <input className="admin-input" value={draft.default_rest} onChange={e => onChange({ default_rest: e.target.value })} placeholder="60s" />
        </label>
        <label>
          <span style={label}>Recomp Priority</span>
          <select
            className="admin-input"
            value={draft.female_recomp_priority}
            onChange={e => onChange({ female_recomp_priority: Number(e.target.value) })}
          >
            <option value={0}>Standard</option>
            <option value={1}>Good</option>
            <option value={2}>Top Pick</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          <span style={label}>Primary Muscles (comma-separated)</span>
          <input
            className="admin-input"
            value={draft.primary_muscles.join(', ')}
            onChange={e => onChange({ primary_muscles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="glutes, hamstrings"
          />
        </label>
        <label>
          <span style={label}>Demo Video URL (optional)</span>
          <input
            className="admin-input"
            value={draft.video_url}
            onChange={e => onChange({ video_url: e.target.value })}
            placeholder="https://youtube.com/..."
          />
        </label>
      </div>

      <label>
        <span style={label}>Form Cues (shown to client)</span>
        <textarea
          className="admin-input"
          rows={3}
          value={draft.cues}
          onChange={e => onChange({ cues: e.target.value })}
          style={{ resize: 'vertical' }}
          placeholder="Short coaching cues — what to feel, what to avoid."
        />
      </label>

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
          {isSaving ? 'Saving…' : isNew ? 'Add to Library' : 'Save Exercise'}
        </button>
      </div>
    </div>
  )
}

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [drafts, setDrafts] = useState<Record<string, typeof EMPTY_EXERCISE>>({})
  const [newExercise, setNewExercise] = useState({ ...EMPTY_EXERCISE })
  const [addingNew, setAddingNew] = useState(false)
  const [newSaving, setNewSaving] = useState(false)
  const [patternFilter, setPatternFilter] = useState<string>('all')
  const [equipFilter, setEquipFilter] = useState<string>('all')
  const [ymoveQuery, setYmoveQuery] = useState('')
  const [ymoveMuscle, setYmoveMuscle] = useState('')
  const [ymoveResults, setYmoveResults] = useState<YMoveSearchResult[]>([])
  const [ymoveLoading, setYmoveLoading] = useState(false)
  const [ymoveError, setYmoveError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/exercises')
      const data = await res.json()
      setExercises(data.exercises ?? [])
      const initial: Record<string, typeof EMPTY_EXERCISE> = {}
      for (const e of (data.exercises ?? []) as LibraryExercise[]) {
        initial[e.id] = {
          name: e.name,
          movement_pattern: e.movement_pattern,
          primary_muscles: e.primary_muscles,
          equipment: e.equipment,
          difficulty: e.difficulty,
          default_sets: e.default_sets,
          default_reps: e.default_reps,
          default_rest: e.default_rest,
          cues: e.cues,
          video_url: e.video_url,
          female_recomp_priority: e.female_recomp_priority,
          archived: e.archived,
        }
      }
      setDrafts(initial)
    } catch {
      setError('Failed to load exercises.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => exercises.filter(e =>
    (patternFilter === 'all' || e.movement_pattern === patternFilter)
    && (equipFilter === 'all' || e.equipment === equipFilter)
  ), [exercises, patternFilter, equipFilter])

  function updateDraft(id: string, patch: Partial<typeof EMPTY_EXERCISE>) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function saveExercise(id: string) {
    setSaving(id)
    setError('')
    try {
      const res = await fetch(`/api/admin/exercises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drafts[id]),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setExercises(prev => prev.map(e => e.id === id ? data.exercise : e))
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  async function deleteExercise(id: string) {
    if (!confirm('Delete this exercise? This cannot be undone.')) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/exercises/${id}`, { method: 'DELETE' })
      setExercises(prev => prev.filter(e => e.id !== id))
    } catch {
      setError('Failed to delete.')
    } finally {
      setDeleting(null)
    }
  }

  async function createExercise() {
    if (!newExercise.name.trim()) return
    setNewSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExercise),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setExercises(prev => [data.exercise, ...prev])
      setDrafts(prev => ({
        ...prev,
        [data.exercise.id]: {
          name: data.exercise.name,
          movement_pattern: data.exercise.movement_pattern,
          primary_muscles: data.exercise.primary_muscles,
          equipment: data.exercise.equipment,
          difficulty: data.exercise.difficulty,
          default_sets: data.exercise.default_sets,
          default_reps: data.exercise.default_reps,
          default_rest: data.exercise.default_rest,
          cues: data.exercise.cues,
          video_url: data.exercise.video_url,
          female_recomp_priority: data.exercise.female_recomp_priority,
          archived: data.exercise.archived,
        },
      }))
      setNewExercise({ ...EMPTY_EXERCISE })
      setAddingNew(false)
    } catch {
      setError('Failed to create exercise.')
    } finally {
      setNewSaving(false)
    }
  }

  async function searchYMove() {
    setYmoveLoading(true)
    setYmoveError('')
    try {
      const params = new URLSearchParams()
      if (ymoveQuery.trim()) params.set('search', ymoveQuery.trim())
      if (ymoveMuscle) params.set('muscleGroup', ymoveMuscle)
      const res = await fetch(`/api/admin/ymove/exercises?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'YMove search failed.')
      setYmoveResults((data.exercises ?? []) as YMoveSearchResult[])
    } catch (error) {
      setYmoveError(error instanceof Error ? error.message : 'YMove search failed.')
      setYmoveResults([])
    } finally {
      setYmoveLoading(false)
    }
  }

  function importYMoveExercise(exercise: YMoveSearchResult) {
    setNewExercise({ ...exercise.lumoraDraft })
    setAddingNew(true)
    setYmoveError('')
    setMessage(`Imported ${exercise.title} from YMove. Review Laura's cues and save it to the Lumora library.`)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '2rem', fontWeight: 700, color: 'var(--admin-on-surface)', margin: 0 }}>
            Exercise Library
          </h1>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Your global exercise database — used to generate client workout plans.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn-primary"
          style={{ background: '#C9A84C', color: '#162814', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setAddingNew(true)}
        >
          <Plus size={15} /> New Exercise
        </button>
      </div>

      <div className="admin-card" style={{ padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-on-surface)', margin: 0 }}>
              Search YMove
            </p>
            <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8rem', color: 'var(--admin-on-surface-variant)', margin: '2px 0 0' }}>
              Import premium white-background exercise videos, then keep Laura&apos;s cues and defaults in Lumora.
            </p>
          </div>
          <Video size={18} style={{ color: '#C9A84C', flexShrink: 0 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label>
            <span style={label}>Exercise Search</span>
            <input
              className="admin-input"
              value={ymoveQuery}
              onChange={e => setYmoveQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  searchYMove()
                }
              }}
              placeholder="hip thrust, dumbbell row..."
            />
          </label>
          <label>
            <span style={label}>Muscle</span>
            <select className="admin-input" value={ymoveMuscle} onChange={e => setYmoveMuscle(e.target.value)}>
              <option value="">Any</option>
              {['glutes', 'hamstrings', 'quads', 'core', 'back', 'chest', 'shoulders', 'biceps', 'triceps', 'cardio'].map(m => (
                <option key={m} value={m}>{patternLabel(m)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="admin-btn-primary"
            disabled={ymoveLoading || (!ymoveQuery.trim() && !ymoveMuscle)}
            onClick={searchYMove}
            style={{ background: '#162814', color: '#fff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}
          >
            <Search size={14} /> {ymoveLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {ymoveError && (
          <p role="alert" style={{ fontFamily: 'var(--font-hanken)', color: '#b91c1c', fontSize: '0.82rem', margin: '10px 0 0' }}>
            {ymoveError}
          </p>
        )}
        {ymoveResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {ymoveResults.map((exercise) => (
              <div
                key={exercise.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  padding: '10px 12px',
                  border: '1px solid var(--admin-outline-variant)',
                  borderRadius: 8,
                  background: 'var(--admin-surface-low)',
                }}
              >
                <div>
                  <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-on-surface)', margin: 0 }}>
                    {exercise.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', margin: '3px 0 0' }}>
                    {[
                      exercise.muscleGroup && patternLabel(exercise.muscleGroup),
                      exercise.equipment && patternLabel(exercise.equipment),
                      exercise.difficulty && patternLabel(exercise.difficulty),
                      exercise.hasVideoWhite ? 'White-background HD' : 'Video available',
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {exercise.slug && (
                    <a
                      href={`/api/ymove/exercises/${encodeURIComponent(exercise.slug)}/video`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn-ghost"
                      style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B5B16', textDecoration: 'none' }}
                    >
                      Preview
                    </a>
                  )}
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    onClick={() => importYMoveExercise(exercise)}
                    style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3F6936' }}
                  >
                    Import
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...label, marginBottom: 0 }}>Pattern</span>
          <select className="admin-input" style={{ width: 'auto' }} value={patternFilter} onChange={e => setPatternFilter(e.target.value)}>
            <option value="all">All</option>
            {MOVEMENT_PATTERNS.map(p => <option key={p} value={p}>{patternLabel(p)}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...label, marginBottom: 0 }}>Equipment</span>
          <select className="admin-input" style={{ width: 'auto' }} value={equipFilter} onChange={e => setEquipFilter(e.target.value)}>
            <option value="all">All</option>
            {EQUIPMENT.map(eq => <option key={eq} value={eq}>{patternLabel(eq)}</option>)}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-hanken)', fontSize: '0.82rem', color: 'var(--admin-on-surface-variant)', alignSelf: 'center' }}>
          {filtered.length} of {exercises.length}
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, background: '#fef2f2', border: '1px solid #fca5a5' }}>
          <p style={{ fontFamily: 'var(--font-hanken)', color: '#b91c1c', fontSize: '0.88rem', margin: 0 }}>{error}</p>
        </div>
      )}
      {message && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, background: '#F0F7ED', border: '1px solid rgba(63,105,54,0.2)' }}>
          <p style={{ fontFamily: 'var(--font-hanken)', color: '#2F5A28', fontSize: '0.88rem', margin: 0 }}>{message}</p>
        </div>
      )}

      {addingNew && (
        <div className="admin-card" style={{ marginBottom: 16, border: '2px solid #C9A84C' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--admin-outline-variant)', background: '#FFFEF9' }}>
            <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-on-surface)', margin: 0 }}>
              New Exercise
            </p>
          </div>
          <ExerciseForm
            draft={newExercise}
            onChange={patch => setNewExercise(prev => ({ ...prev, ...patch }))}
            onSave={createExercise}
            saving={newSaving}
            isNew
            onCancel={() => { setAddingNew(false); setNewExercise({ ...EMPTY_EXERCISE }) }}
          />
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', textAlign: 'center', padding: '40px 0' }}>
          Loading exercises…
        </p>
      ) : filtered.length === 0 ? (
        <div className="admin-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.5rem', color: 'var(--admin-on-surface)', margin: '0 0 8px' }}>
            {exercises.length === 0 ? 'No exercises yet' : 'No matches'}
          </p>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)', fontSize: '0.9rem', margin: 0 }}>
            {exercises.length === 0
              ? 'Click "New Exercise" to add your first exercise to the library.'
              : 'Try clearing a filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(exercise => {
            const draft = drafts[exercise.id]
            if (!draft) return null
            return (
              <details key={exercise.id} className="admin-card" style={{ overflow: 'hidden' }}>
                <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', background: 'var(--admin-surface-low)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {exercise.female_recomp_priority > 0 && (
                      <Star
                        size={14}
                        style={{
                          color: exercise.female_recomp_priority === 2 ? '#C9A84C' : '#B8B8B8',
                          fill: exercise.female_recomp_priority === 2 ? '#C9A84C' : 'none',
                        }}
                      />
                    )}
                    <div>
                      <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-on-surface)' }}>
                        {draft.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', marginTop: 2 }}>
                        {patternLabel(draft.movement_pattern)} · {patternLabel(draft.equipment)} · {draft.default_sets}×{draft.default_reps} · rest {draft.default_rest}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="admin-btn-ghost"
                      style={{ color: 'var(--admin-error)', fontSize: '0.78rem', padding: '4px 8px' }}
                      disabled={deleting === exercise.id}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); deleteExercise(exercise.id) }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronDown size={15} style={{ color: 'var(--admin-on-surface-variant)' }} />
                  </div>
                </summary>
                <div style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
                  <ExerciseForm
                    draft={draft}
                    onChange={patch => updateDraft(exercise.id, patch)}
                    onSave={() => saveExercise(exercise.id)}
                    saving={saving === exercise.id}
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
