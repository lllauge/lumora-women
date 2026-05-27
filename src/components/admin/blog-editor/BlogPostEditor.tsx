'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import slugify from 'slugify'
import {
  ArrowLeft, CalendarClock, CloudCheck, CloudOff, Eye, Loader2, Send, Trash2,
} from 'lucide-react'
import {
  deleteBlogPostFromEditor, saveBlogPost, uploadBlogAsset,
  type BlogAction, type UploadBlogAssetResult,
} from '@/app/actions/admin-blog-editor'
import TiptapEditor from './TiptapEditor'
import FeaturedImageUploader from './FeaturedImageUploader'

export type BlogPostInitial = {
  id?: string
  title: string
  slug: string
  body: string
  category: string | null
  featured_image_url: string | null
  published: boolean
  /** May be null when v3 migration hasn't been run yet. */
  published_at: string | null
  scheduled_at: string | null
}

export default function BlogPostEditor({
  initial,
  mode,
  r2Configured,
  schedulingAvailable,
}: {
  initial: BlogPostInitial
  mode: 'new' | 'edit'
  r2Configured: boolean
  schedulingAvailable: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const [title, setTitle]                       = useState(initial.title)
  const [slug, setSlug]                         = useState(initial.slug)
  const [slugManuallyEdited, setSlugEdited]     = useState(!!initial.slug && mode === 'edit')
  const [category, setCategory]                 = useState(initial.category ?? '')
  const [featuredImage, setFeaturedImage]       = useState(initial.featured_image_url ?? '')
  const [body, setBody]                         = useState(initial.body)
  const [wordCount, setWordCount]               = useState(
    initial.body ? initial.body.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0
  )
  const [scheduleAt, setScheduleAt]             = useState(
    initial.scheduled_at
      ? toLocalDatetimeInput(new Date(initial.scheduled_at))
      : ''
  )

  // Auto-derive slug from title until the user manually edits it
  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugManuallyEdited) {
      const auto = slugify(v || '', { lower: true, strict: true, trim: true })
      setSlug(auto)
    }
  }
  function handleSlugChange(v: string) {
    setSlug(v)
    setSlugEdited(true)
  }

  function buildPayload() {
    return {
      id: initial.id,
      title,
      slug: slug || slugify(title || 'untitled', { lower: true, strict: true, trim: true }),
      body,
      category: category.trim() || null,
      featured_image_url: featuredImage.trim() || null,
    }
  }

  function handleSave(action: BlogAction) {
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg('Please add a title before saving.')
      return
    }
    if (action.kind === 'schedule' && !action.at) {
      setErrorMsg('Pick a schedule date and time first.')
      return
    }

    startTransition(async () => {
      const result = await saveBlogPost(buildPayload(), action)
      if (!result.ok) {
        setErrorMsg(result.error)
        return
      }
      setLastSavedAt(new Date())
      if (mode === 'new') {
        router.push(`/admin/blog/edit/${result.postId}`)
      } else {
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!initial.id) return
    if (!window.confirm(`Permanently delete "${title || 'this post'}"?`)) return
    const fd = new FormData()
    fd.append('id', initial.id)
    startTransition(async () => {
      const result = await deleteBlogPostFromEditor(fd)
      if (result.ok) router.push('/admin/blog')
      else setErrorMsg(result.error ?? 'Could not delete the post.')
    })
  }

  async function uploadAsset(file: File): Promise<UploadBlogAssetResult> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', 'featured')
    fd.append('postId', initial.id ?? 'unfiled')
    return uploadBlogAsset(fd)
  }

  const currentStatus = useMemo<'Published' | 'Scheduled' | 'Draft'>(() => {
    if (initial.published) return 'Published'
    if (initial.scheduled_at) return 'Scheduled'
    return 'Draft'
  }, [initial.published, initial.scheduled_at])

  return (
    <div className="space-y-6 pb-10">
      {/* In-page header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/blog"
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
          <span>Back to Blog Posts</span>
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
          {mode === 'new' ? 'New Blog Post' : `Edit · ${initial.title || 'Untitled post'}`}
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

        {/* ── Left: title + editor ─────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Title card */}
          <div className="admin-card p-6 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title…"
              aria-label="Post title"
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                width: '100%',
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '2rem',
                fontWeight: 500,
                color: 'var(--admin-primary-container)',
                lineHeight: 1.15,
              }}
            />
            <div className="flex items-center gap-3">
              <label
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--admin-on-surface-variant)',
                }}
              >
                Slug
              </label>
              <span style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.8125rem',
                color: 'var(--admin-on-surface-variant)',
              }}>
                /blog/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="auto-from-title"
                aria-label="URL slug"
                style={{
                  flex: 1,
                  background: 'var(--admin-surface-low)',
                  padding: '0.375rem 0.625rem',
                  fontSize: '0.8125rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              />
            </div>
          </div>

          {/* Editor card */}
          <div
            className="admin-card flex flex-col overflow-hidden"
            style={{ minHeight: '520px' }}
          >
            <TiptapEditor
              value={body}
              onChange={(html, count) => {
                setBody(html)
                setWordCount(count)
              }}
              placeholder="Write your story…"
            />
          </div>
        </div>

        {/* ── Right: actions + meta ────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSave({ kind: 'publish' })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'var(--admin-primary-container)',
                color: 'var(--admin-bg)',
                fontFamily: 'var(--font-hanken)',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.05em',
                border: 'none',
                cursor: pending ? 'wait' : 'pointer',
                boxShadow: '0 8px 20px -8px rgba(0, 30, 20, 0.35)',
              }}
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {initial.published ? 'Update & Publish' : 'Publish Now'}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSave({ kind: 'draft' })}
                className="py-2.5 rounded-lg transition-colors disabled:opacity-60"
                style={{
                  border: '1px solid var(--admin-primary-container)',
                  color: 'var(--admin-primary-container)',
                  background: 'transparent',
                  fontFamily: 'var(--font-hanken)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.04em',
                  cursor: pending ? 'wait' : 'pointer',
                }}
              >
                Save Draft
              </button>
              <a
                href={initial.id ? `/blog/${slug || initial.slug}` : '#'}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!initial.id}
                onClick={(e) => { if (!initial.id) e.preventDefault() }}
                className="py-2.5 rounded-lg transition-colors text-center inline-flex items-center justify-center gap-1.5"
                style={{
                  border: '1px solid var(--admin-primary-container)',
                  color: initial.id ? 'var(--admin-primary-container)' : 'var(--admin-outline-variant)',
                  background: 'transparent',
                  fontFamily: 'var(--font-hanken)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.04em',
                  cursor: initial.id ? 'pointer' : 'not-allowed',
                  textDecoration: 'none',
                  opacity: initial.id ? 1 : 0.6,
                }}
              >
                <Eye size={14} />
                Preview
              </a>
            </div>

            {/* Save state line */}
            <div
              className="flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.75rem',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              {pending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <CloudCheck size={14} style={{ color: 'var(--admin-sage)' }} />
                  <span>Saved at {lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </>
              ) : (
                <>
                  <CloudOff size={14} style={{ opacity: 0.5 }} />
                  <span>Unsaved changes</span>
                </>
              )}
            </div>
          </div>

          {/* Status & Schedule */}
          <section className="admin-card p-5 space-y-4">
            <h3
              className="uppercase"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
                margin: 0,
              }}
            >
              Status &amp; Schedule
            </h3>

            <div className="flex items-center justify-between">
              <span style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--admin-on-surface)',
              }}>
                Current
              </span>
              <span className={
                'admin-pill ' +
                (currentStatus === 'Published' ? 'admin-pill-success'
                  : currentStatus === 'Scheduled' ? 'admin-pill-warning'
                  : 'admin-pill-neutral')
              }>
                {currentStatus}
              </span>
            </div>

            {initial.published_at && (
              <p style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.75rem',
                color: 'var(--admin-on-surface-variant)',
                margin: 0,
              }}>
                Published at {new Date(initial.published_at).toLocaleString()}
              </p>
            )}

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
                Schedule For Later
              </label>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                disabled={!schedulingAvailable}
                style={{ background: 'var(--admin-surface-low)', fontSize: '0.8125rem' }}
              />
              <button
                type="button"
                disabled={pending || !scheduleAt || !schedulingAvailable}
                onClick={() => handleSave({ kind: 'schedule', at: new Date(scheduleAt).toISOString() })}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--admin-sage-container)',
                  color: 'var(--admin-on-sage-container)',
                  fontFamily: 'var(--font-hanken)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.04em',
                  border: 'none',
                  cursor: (pending || !scheduleAt || !schedulingAvailable) ? 'not-allowed' : 'pointer',
                }}
              >
                <CalendarClock size={14} />
                Schedule
              </button>
              {!schedulingAvailable && (
                <p
                  className="mt-2 italic"
                  style={{
                    fontFamily: 'var(--font-hanken)',
                    fontSize: '0.7rem',
                    color: 'var(--admin-on-surface-variant)',
                    lineHeight: 1.4,
                  }}
                >
                  Run <code>supabase-schema-v3.sql</code> to enable scheduling
                  (adds <code>published_at</code> + <code>scheduled_at</code>).
                </p>
              )}
            </div>
          </section>

          {/* Featured image */}
          <section className="admin-card p-5">
            <p
              className="uppercase mb-3"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              Featured Image
            </p>
            <FeaturedImageUploader
              value={featuredImage}
              onChange={setFeaturedImage}
              uploadAsset={uploadAsset}
              r2Configured={r2Configured}
            />
          </section>

          {/* Categorization */}
          <section className="admin-card p-5">
            <p
              className="uppercase mb-3"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              Category
            </p>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Mindfulness, Hormones, Postpartum…"
              style={{ background: 'var(--admin-surface-low)', fontSize: '0.875rem' }}
            />
            <p
              className="mt-2 italic"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.7rem',
                color: 'var(--admin-on-surface-variant)',
                lineHeight: 1.4,
              }}
            >
              Single text field today — a <code>tags</code> column can be added with a future schema migration.
            </p>
          </section>

          {/* Editor stats / meta line */}
          <p
            className="text-center italic"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.7rem',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            {wordCount.toLocaleString()} word{wordCount === 1 ? '' : 's'} · {Math.max(1, Math.round(wordCount / 200))} min read
          </p>

          {/* Danger zone */}
          {mode === 'edit' && initial.id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              style={{
                background: 'transparent',
                color: 'var(--admin-error)',
                border: '1px solid var(--admin-error)',
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                cursor: pending ? 'wait' : 'pointer',
              }}
            >
              <Trash2 size={14} />
              Delete Post
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a Date as the local `YYYY-MM-DDTHH:mm` string an <input type=datetime-local> wants. */
function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}
