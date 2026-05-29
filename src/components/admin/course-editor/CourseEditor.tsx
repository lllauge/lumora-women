'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useReducer, useState, useTransition } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronRight, CloudCheck, CloudOff,
  Eye, FolderOpen, GripVertical, Loader2, Plus, Trash2,
} from 'lucide-react'
import {
  saveCourse,
  uploadCourseAsset,
  type UploadAssetResult,
} from '@/app/actions/admin-course-editor'
import {
  type CourseDraft, type ModuleDraft, type LessonDraft, type DownloadDraft,
  newKey, toServerPayload,
} from './types'
import ThumbnailUploader from './ThumbnailUploader'
import VideoUploader from './VideoUploader'
import DownloadList from './DownloadList'

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_FIELD';      field: keyof Omit<CourseDraft, 'modules'>; value: string | number | boolean }
  | { type: 'ADD_MODULE' }
  | { type: 'DELETE_MODULE';  moduleKey: string }
  | { type: 'UPDATE_MODULE_TITLE'; moduleKey: string; title: string }
  | { type: 'MOVE_MODULE';    moduleKey: string; direction: 'up' | 'down' }
  | { type: 'ADD_LESSON';     moduleKey: string }
  | { type: 'DELETE_LESSON';  moduleKey: string; lessonKey: string }
  | { type: 'UPDATE_LESSON';  moduleKey: string; lessonKey: string; field: 'title' | 'video_url' | 'content'; value: string }
  | { type: 'MOVE_LESSON';    moduleKey: string; lessonKey: string; direction: 'up' | 'down' }
  | { type: 'SET_DOWNLOADS';  moduleKey: string; lessonKey: string; downloads: DownloadDraft[] }

function reducer(state: CourseDraft, action: Action): CourseDraft {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value } as CourseDraft

    case 'ADD_MODULE':
      return {
        ...state,
        modules: [
          ...state.modules,
          {
            _key: newKey('m'),
            title: `Module ${state.modules.length + 1}: New Module`,
            lessons: [],
          },
        ],
      }

    case 'DELETE_MODULE':
      return { ...state, modules: state.modules.filter((m) => m._key !== action.moduleKey) }

    case 'UPDATE_MODULE_TITLE':
      return {
        ...state,
        modules: state.modules.map((m) =>
          m._key === action.moduleKey ? { ...m, title: action.title } : m
        ),
      }

    case 'MOVE_MODULE': {
      const idx = state.modules.findIndex((m) => m._key === action.moduleKey)
      if (idx === -1) return state
      const newIdx = action.direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= state.modules.length) return state
      const next = [...state.modules]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return { ...state, modules: next }
    }

    case 'ADD_LESSON':
      return {
        ...state,
        modules: state.modules.map((m) =>
          m._key === action.moduleKey
            ? {
                ...m,
                lessons: [
                  ...m.lessons,
                  {
                    _key: newKey('l'),
                    title: `New Lesson ${m.lessons.length + 1}`,
                    content: '',
                    video_url: '',
                    downloads: [],
                  },
                ],
              }
            : m
        ),
      }

    case 'DELETE_LESSON':
      return {
        ...state,
        modules: state.modules.map((m) =>
          m._key === action.moduleKey
            ? { ...m, lessons: m.lessons.filter((l) => l._key !== action.lessonKey) }
            : m
        ),
      }

    case 'UPDATE_LESSON':
      return {
        ...state,
        modules: state.modules.map((m) =>
          m._key === action.moduleKey
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l._key === action.lessonKey ? { ...l, [action.field]: action.value } : l
                ),
              }
            : m
        ),
      }

    case 'MOVE_LESSON': {
      return {
        ...state,
        modules: state.modules.map((m) => {
          if (m._key !== action.moduleKey) return m
          const idx = m.lessons.findIndex((l) => l._key === action.lessonKey)
          if (idx === -1) return m
          const newIdx = action.direction === 'up' ? idx - 1 : idx + 1
          if (newIdx < 0 || newIdx >= m.lessons.length) return m
          const next = [...m.lessons]
          ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
          return { ...m, lessons: next }
        }),
      }
    }

    case 'SET_DOWNLOADS':
      return {
        ...state,
        modules: state.modules.map((m) =>
          m._key === action.moduleKey
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l._key === action.lessonKey ? { ...l, downloads: action.downloads } : l
                ),
              }
            : m
        ),
      }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CourseEditor({
  initial,
  mode,
  r2Configured,
  streamConfigured,
}: {
  initial: CourseDraft
  mode: 'new' | 'edit'
  r2Configured: boolean
  streamConfigured: boolean
}) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initial)
  const [expandedModule, setExpandedModule] = useState<string | null>(
    initial.modules[0]?._key ?? null
  )
  const [pending, startTransition] = useTransition()
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Centralised uploader so children don't have to import the server action
  async function uploadAsset(file: File, kind: 'thumbnail' | 'download' | 'video'): Promise<UploadAssetResult> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)
    fd.append('courseId', state.id ?? 'unfiled')
    return uploadCourseAsset(fd)
  }

  function handleSave(publish: boolean) {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await saveCourse(toServerPayload(state), { publish })
      if (!result.ok) {
        setErrorMsg(result.error)
        return
      }
      setLastSavedAt(new Date())
      if (mode === 'new') {
        router.push(`/admin/courses/edit/${result.courseId}`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6 pb-28">
      {/* ── In-page header (overrides the global topbar title) ────────── */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-2 transition-colors"
          style={{
            color: 'var(--admin-on-surface-variant)',
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to Courses</span>
        </Link>
        <div className="h-4 w-px" style={{ background: 'var(--admin-outline-variant)' }} />
        <h2
          style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
          }}
        >
          {mode === 'new' ? 'Create New Course' : `Edit · ${state.title || 'Untitled course'}`}
        </h2>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="admin-card p-4 flex items-start gap-3"
          style={{
            background: 'var(--admin-rose-fixed)',
            borderColor: 'var(--admin-rose-container)',
            color: 'var(--admin-on-rose-fixed)',
          }}
        >
          <CloudOff size={18} className="mt-0.5 shrink-0" />
          <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', margin: 0 }}>
            {errorMsg}
          </p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6 items-start">

        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Basic info */}
          <section className="admin-card p-6 space-y-5">
            <Field
              label="Course Title"
              value={state.title}
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'title', value: v })}
              placeholder="e.g. Bloom Again — A Postpartum Wellness Course"
              big
            />
            <Field
              label="Subtitle / Short Summary"
              value={state.subtitle}
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'subtitle', value: v })}
              placeholder="A comprehensive guide for navigating the fourth trimester."
              type="textarea"
              rows={2}
            />
            <Field
              label="Description"
              value={state.description}
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'description', value: v })}
              placeholder="Elaborate on course outcomes, curriculum, and target audience…"
              type="textarea"
              rows={6}
            />
          </section>

          {/* Curriculum */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3
                style={{
                  fontFamily: 'var(--font-eb-garamond)',
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: 'var(--admin-primary-container)',
                }}
              >
                Curriculum Builder
              </h3>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'ADD_MODULE' })
                  // expand the new module
                  setTimeout(() => {
                    const lastKey = state.modules[state.modules.length]?._key
                    if (lastKey) setExpandedModule(lastKey)
                  }, 0)
                }}
                className="admin-btn-ghost"
                style={{ color: 'var(--admin-primary-container)' }}
              >
                <Plus size={18} />
                Add Module
              </button>
            </div>

            {state.modules.length === 0 ? (
              <div
                className="admin-card p-10 text-center"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.9375rem',
                  color: 'var(--admin-on-surface-variant)',
                }}
              >
                No modules yet — add your first to start building the curriculum.
              </div>
            ) : (
              state.modules.map((module, mi) => (
                <ModuleCard
                  key={module._key}
                  module={module}
                  index={mi}
                  total={state.modules.length}
                  expanded={expandedModule === module._key}
                  onToggle={() => setExpandedModule(expandedModule === module._key ? null : module._key)}
                  dispatch={dispatch}
                  uploadAsset={uploadAsset}
                  r2Configured={r2Configured}
                  streamConfigured={streamConfigured}
                />
              ))
            )}
          </section>
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* Thumbnail */}
          <section className="admin-card p-6">
            <p
              className="uppercase mb-4"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              Course Thumbnail
            </p>
            <ThumbnailUploader
              value={state.thumbnail_url}
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'thumbnail_url', value: v })}
              uploadAsset={uploadAsset}
              r2Configured={r2Configured}
            />
          </section>

          {/* Status + pricing */}
          <section className="admin-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4
                  style={{
                    fontFamily: 'var(--font-hanken)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--admin-on-surface)',
                    margin: 0,
                  }}
                >
                  Publish Status
                </h4>
                <p
                  style={{
                    fontFamily: 'var(--font-hanken)',
                    fontSize: '0.8125rem',
                    color: 'var(--admin-on-surface-variant)',
                    marginTop: '0.25rem',
                  }}
                >
                  {mode === 'new' ? 'New — not yet saved' : 'Use Publish / Save Draft below to change'}
                </p>
              </div>
            </div>

            <div className="h-px" style={{ background: 'var(--admin-outline-variant)', opacity: 0.5 }} />

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4
                    style={{
                      fontFamily: 'var(--font-hanken)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--admin-on-surface)',
                      margin: 0,
                    }}
                  >
                    Course Pricing
                  </h4>
                  <p
                    style={{
                      fontFamily: 'var(--font-hanken)',
                      fontSize: '0.8125rem',
                      color: 'var(--admin-on-surface-variant)',
                      marginTop: '0.25rem',
                    }}
                  >
                    Toggle paid / free
                  </p>
                </div>
                <div
                  className="flex rounded-lg p-1"
                  style={{ background: 'var(--admin-surface-container)' }}
                  role="radiogroup"
                  aria-label="Pricing"
                >
                  <PricingToggle
                    label="Paid"
                    active={!state.is_free}
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'is_free', value: false })}
                  />
                  <PricingToggle
                    label="Free"
                    active={state.is_free}
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'is_free', value: true })}
                  />
                </div>
              </div>

              {!state.is_free && (
                <div>
                  <label
                    className="uppercase"
                    style={{
                      fontFamily: 'var(--font-hanken)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: 'var(--admin-on-surface-variant)',
                    }}
                  >
                    Base Price (USD)
                  </label>
                  <div className="relative mt-1">
                    <span
                      className="absolute"
                      style={{
                        left: '0.875rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--admin-on-surface-variant)',
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={state.price}
                      onChange={(e) => dispatch({
                        type: 'SET_FIELD', field: 'price',
                        value: Math.max(0, Number(e.target.value) || 0),
                      })}
                      style={{ paddingLeft: '2rem' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Note on category/tags (out of scope until schema migration) */}
          <section
            className="p-4 rounded-lg"
            style={{
              background: 'var(--admin-surface-container)',
              border: '1px dashed var(--admin-outline-variant)',
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--admin-on-surface)' }}>Category &amp; tags</strong> will
              appear here once the schema migration adds <code>category</code> and <code>tags</code>{' '}
              columns to <code>courses</code>. (Queued for v3.)
            </p>
          </section>
        </div>
      </div>

      {/* ── Sticky save bar ──────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md admin-save-bar"
        style={{
          height: '80px',
          background: 'rgba(250, 249, 244, 0.92)',
          borderTop: '1px solid var(--admin-outline-variant)',
          paddingLeft: 'var(--admin-container-pad)',
          paddingRight: 'var(--admin-container-pad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          className="flex items-center gap-3"
          style={{ color: 'var(--admin-on-surface-variant)', fontFamily: 'var(--font-hanken)', fontSize: '0.875rem' }}
        >
          {pending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Saving…</span>
            </>
          ) : lastSavedAt ? (
            <>
              <CloudCheck size={18} style={{ color: 'var(--admin-sage)' }} />
              <span>Last saved at {lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </>
          ) : (
            <>
              <CloudOff size={18} style={{ opacity: 0.5 }} />
              <span>Unsaved changes</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {state.id && (
            <a
              href={`/courses/${state.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3 rounded-full transition-all hover:opacity-80"
              style={{
                border: '1px solid var(--admin-primary-container)',
                color: 'var(--admin-primary-container)',
                background: 'transparent',
                fontFamily: 'var(--font-hanken)',
                fontWeight: 600,
                fontSize: '0.875rem',
                letterSpacing: '0.05em',
                textDecoration: 'none',
              }}
            >
              <Eye size={16} />
              Preview
            </a>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSave(false)}
            className="px-7 py-3 rounded-full transition-all disabled:opacity-60"
            style={{
              border: '1px solid var(--admin-primary-container)',
              color: 'var(--admin-primary-container)',
              background: 'transparent',
              fontFamily: 'var(--font-hanken)',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              cursor: pending ? 'wait' : 'pointer',
            }}
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSave(true)}
            className="px-8 py-3 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'var(--admin-primary-container)',
              color: 'var(--admin-bg)',
              border: '1px solid var(--admin-primary-container)',
              fontFamily: 'var(--font-hanken)',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              cursor: pending ? 'wait' : 'pointer',
              boxShadow: '0 8px 20px -8px rgba(0, 30, 20, 0.35)',
            }}
          >
            Publish Course
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Smaller components ───────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text', rows = 3, big = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'textarea'
  rows?: number
  big?: boolean
}) {
  return (
    <div>
      <label
        className="uppercase"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'var(--admin-on-surface-variant)',
          marginBottom: '0.5rem',
          display: 'block',
        }}
      >
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={{ background: 'var(--admin-surface-low)' }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            background: 'var(--admin-surface-low)',
            ...(big ? { fontFamily: 'var(--font-eb-garamond)', fontSize: '1.25rem', fontWeight: 500 } : {}),
          }}
        />
      )}
    </div>
  )
}

function PricingToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className="px-3 py-1 rounded-md transition-all"
      style={{
        background: active ? 'var(--admin-surface)' : 'transparent',
        color: active ? 'var(--admin-primary-container)' : 'var(--admin-on-surface-variant)',
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        border: 'none',
        cursor: 'pointer',
        boxShadow: active ? '0 1px 2px rgba(21,51,40,0.06)' : 'none',
      }}
    >
      {label.toUpperCase()}
    </button>
  )
}

function ModuleCard({
  module, index, total, expanded, onToggle, dispatch, uploadAsset, r2Configured, streamConfigured,
}: {
  module: ModuleDraft
  index: number
  total: number
  expanded: boolean
  onToggle: () => void
  dispatch: React.Dispatch<Action>
  uploadAsset: (file: File, kind: 'thumbnail' | 'download' | 'video') => Promise<UploadAssetResult>
  r2Configured: boolean
  streamConfigured: boolean
}) {
  return (
    <div
      className="admin-card overflow-hidden transition-colors group"
      style={{ borderRadius: '0.75rem' }}
    >
      {/* Module header */}
      <div
        className="p-4 flex items-center gap-3"
        style={{ background: 'var(--admin-surface-container)' }}
      >
        <div className="flex flex-col" style={{ opacity: 0.4 }}>
          <button
            type="button"
            onClick={() => dispatch({ type: 'MOVE_MODULE', moduleKey: module._key, direction: 'up' })}
            disabled={index === 0}
            aria-label="Move module up"
            className="hover:opacity-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            style={{ background: 'transparent', border: 'none', padding: '2px' }}
          >
            <GripVertical size={14} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
        <FolderOpen size={18} style={{ color: 'var(--admin-primary-container)' }} />
        <input
          type="text"
          value={module.title}
          onChange={(e) => dispatch({ type: 'UPDATE_MODULE_TITLE', moduleKey: module._key, title: e.target.value })}
          aria-label={`Module ${index + 1} title`}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--admin-on-surface)',
            padding: '0.25rem 0',
            boxShadow: 'none',
            width: 'auto',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
          }}
        >
          {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${module.title}" and all its lessons?`)) {
                dispatch({ type: 'DELETE_MODULE', moduleKey: module._key })
              }
            }}
            aria-label="Delete module"
            className="p-1.5 rounded transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--admin-error)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--admin-on-surface-variant)')}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse module' : 'Expand module'}
            aria-expanded={expanded}
            className="p-1.5"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
          >
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>

      {/* Lessons */}
      {expanded && (
        <div className="p-6 space-y-4">
          {module.lessons.length === 0 ? (
            <p
              className="text-center py-4"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.875rem',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              No lessons yet. Add the first one below.
            </p>
          ) : (
            module.lessons.map((lesson, li) => (
              <LessonRow
                key={lesson._key}
                lesson={lesson}
                moduleKey={module._key}
                index={li}
                total={module.lessons.length}
                dispatch={dispatch}
                uploadAsset={uploadAsset}
                r2Configured={r2Configured}
                streamConfigured={streamConfigured}
              />
            ))
          )}

          <button
            type="button"
            onClick={() => dispatch({ type: 'ADD_LESSON', moduleKey: module._key })}
            className="w-full py-3 rounded-lg transition-all flex justify-center items-center gap-2"
            style={{
              border: '1px dashed var(--admin-outline-variant)',
              background: 'transparent',
              color: 'var(--admin-on-surface-variant)',
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--admin-celadon)'
              e.currentTarget.style.color = 'var(--admin-primary-container)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--admin-outline-variant)'
              e.currentTarget.style.color = 'var(--admin-on-surface-variant)'
            }}
          >
            <Plus size={16} />
            Add Lesson
          </button>
        </div>
      )}
    </div>
  )
}

function LessonRow({
  lesson, moduleKey, index, total, dispatch, uploadAsset, r2Configured, streamConfigured,
}: {
  lesson: LessonDraft
  moduleKey: string
  index: number
  total: number
  dispatch: React.Dispatch<Action>
  uploadAsset: (file: File, kind: 'thumbnail' | 'download' | 'video') => Promise<UploadAssetResult>
  r2Configured: boolean
  streamConfigured: boolean
}) {
  return (
    <div
      className="p-4 rounded-lg flex gap-3 items-start"
      style={{
        background: 'var(--admin-surface-low)',
        border: '1px solid rgba(193, 200, 195, 0.4)',
      }}
    >
      <div className="flex flex-col gap-1 mt-1" style={{ opacity: 0.5 }}>
        <button
          type="button"
          onClick={() => dispatch({ type: 'MOVE_LESSON', moduleKey, lessonKey: lesson._key, direction: 'up' })}
          disabled={index === 0}
          aria-label="Move lesson up"
          className="disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit' }}
        >
          <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'MOVE_LESSON', moduleKey, lessonKey: lesson._key, direction: 'down' })}
          disabled={index === total - 1}
          aria-label="Move lesson down"
          className="disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit' }}
        >
          <ChevronDown size={12} />
        </button>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex justify-between gap-2">
          <input
            type="text"
            value={lesson.title}
            placeholder={`Lesson ${index + 1} title`}
            onChange={(e) => dispatch({
              type: 'UPDATE_LESSON', moduleKey, lessonKey: lesson._key, field: 'title', value: e.target.value,
            })}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--admin-on-surface)',
              padding: '0.25rem 0',
              boxShadow: 'none',
              width: 'auto',
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${lesson.title}"?`)) {
                dispatch({ type: 'DELETE_LESSON', moduleKey, lessonKey: lesson._key })
              }
            }}
            aria-label="Delete lesson"
            className="p-1.5 rounded transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-error)' }}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label
              className="uppercase block mb-1"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              Video
            </label>
            <VideoUploader
              value={lesson.video_url}
              onChange={(v) => dispatch({
                type: 'UPDATE_LESSON', moduleKey, lessonKey: lesson._key, field: 'video_url', value: v,
              })}
              streamConfigured={streamConfigured}
            />
          </div>
          <div>
            <label
              className="uppercase block mb-1"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              Attachments
            </label>
            <DownloadList
              downloads={lesson.downloads}
              onChange={(downloads) => dispatch({
                type: 'SET_DOWNLOADS', moduleKey, lessonKey: lesson._key, downloads,
              })}
              uploadAsset={uploadAsset}
              r2Configured={r2Configured}
            />
          </div>
        </div>

        <div>
          <label
            className="uppercase block mb-1"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            Lesson notes (optional)
          </label>
          <textarea
            rows={2}
            value={lesson.content}
            onChange={(e) => dispatch({
              type: 'UPDATE_LESSON', moduleKey, lessonKey: lesson._key, field: 'content', value: e.target.value,
            })}
            placeholder="Anything students should read alongside the video — transcripts, summaries, prompts…"
            style={{ background: 'var(--admin-surface)', fontSize: '0.8125rem' }}
          />
        </div>
      </div>
    </div>
  )
}
