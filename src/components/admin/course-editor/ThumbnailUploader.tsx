'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Link as LinkIcon, Loader2, X } from 'lucide-react'
import type { UploadAssetResult } from '@/app/actions/admin-course-editor'

export default function ThumbnailUploader({
  value,
  onChange,
  uploadAsset,
  r2Configured,
}: {
  value: string
  onChange: (url: string) => void
  uploadAsset: (file: File, kind: 'thumbnail' | 'download') => Promise<UploadAssetResult>
  r2Configured: boolean
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleFile(file: File) {
    setError(null)
    startTransition(async () => {
      const result = await uploadAsset(file, 'thumbnail')
      if (!result.ok) setError(result.error)
      else onChange(result.url)
    })
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = '' // reset so re-selecting same file fires onChange
        }}
      />

      {/* Preview or upload zone */}
      {value ? (
        <div
          className="relative aspect-video w-full rounded-xl overflow-hidden"
          style={{ background: 'var(--admin-surface-low)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Course thumbnail" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => { onChange(''); setError(null) }}
            aria-label="Remove thumbnail"
            className="absolute top-2 right-2 p-1.5 rounded-full transition-opacity"
            style={{
              background: 'rgba(27, 28, 25, 0.7)',
              color: 'var(--admin-bg)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={pending}
          className="aspect-video w-full rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors group"
          style={{
            border: '2px dashed var(--admin-outline-variant)',
            background: 'var(--admin-surface-low)',
            cursor: pending ? 'wait' : 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-surface-high)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--admin-surface-low)')}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
            style={{ background: 'var(--admin-sage-container)' }}
          >
            {pending
              ? <Loader2 size={22} className="animate-spin" style={{ color: 'var(--admin-primary-container)' }} />
              : <ImagePlus size={22} style={{ color: 'var(--admin-primary-container)' }} />}
          </div>
          <p
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--admin-on-surface)',
            }}
          >
            {pending ? 'Uploading…' : 'Upload primary cover image'}
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            16:9 ratio recommended · JPG, PNG, WEBP
          </p>
        </button>
      )}

      {/* URL fallback (always shown; only path when R2 isn't configured) */}
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
          {r2Configured ? 'Or paste an external URL' : 'Paste a thumbnail URL'}
        </label>
        <div className="relative">
          <LinkIcon
            size={14}
            style={{
              position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--admin-outline-variant)', pointerEvents: 'none',
            }}
          />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            style={{
              paddingLeft: '2rem',
              background: 'var(--admin-surface)',
              fontSize: '0.8125rem',
            }}
          />
        </div>
      </div>

      {!r2Configured && (
        <p
          className="italic"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
            lineHeight: 1.4,
          }}
        >
          Cloudflare R2 isn&apos;t configured yet — uploads are disabled. Paste a URL above, or
          fill out the R2_* env vars to enable file uploads.
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-error)',
            background: 'var(--admin-rose-fixed)',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
