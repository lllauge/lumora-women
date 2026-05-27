'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Link as LinkIcon, Loader2, X } from 'lucide-react'
import type { UploadBlogAssetResult } from '@/app/actions/admin-blog-editor'

export default function FeaturedImageUploader({
  value,
  onChange,
  uploadAsset,
  r2Configured,
}: {
  value: string
  onChange: (url: string) => void
  uploadAsset: (file: File) => Promise<UploadBlogAssetResult>
  r2Configured: boolean
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleFile(file: File) {
    setError(null)
    startTransition(async () => {
      const result = await uploadAsset(file)
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
          e.target.value = ''
        }}
      />

      {value ? (
        <div
          className="relative aspect-video w-full rounded-lg overflow-hidden"
          style={{ background: 'var(--admin-surface-low)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Featured image" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-between p-2 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={pending || !r2Configured}
              title={!r2Configured ? 'R2 not configured — paste a URL below' : 'Replace image'}
              className="px-3 py-1 rounded text-xs"
              style={{
                background: 'rgba(255,255,255,0.95)',
                color: 'var(--admin-primary-container)',
                fontFamily: 'var(--font-hanken)',
                fontWeight: 600,
                border: 'none',
                cursor: r2Configured ? 'pointer' : 'not-allowed',
              }}
            >
              {pending ? 'Uploading…' : 'Change'}
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setError(null) }}
              aria-label="Remove featured image"
              className="p-1.5 rounded-full"
              style={{
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={pending}
          className="aspect-video w-full rounded-lg flex flex-col items-center justify-center p-4 text-center transition-colors group"
          style={{
            border: '2px dashed var(--admin-outline-variant)',
            background: 'var(--admin-surface-low)',
            cursor: pending ? 'wait' : 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-surface-high)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--admin-surface-low)')}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
            style={{ background: 'var(--admin-sage-container)' }}
          >
            {pending
              ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--admin-primary-container)' }} />
              : <ImagePlus size={18} style={{ color: 'var(--admin-primary-container)' }} />}
          </div>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--admin-on-surface)',
          }}>
            {pending ? 'Uploading…' : 'Upload featured image'}
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            1200 × 630 recommended
          </p>
        </button>
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
          {r2Configured ? 'Or paste an image URL' : 'Paste an image URL'}
        </label>
        <div className="relative">
          <LinkIcon
            size={12}
            style={{
              position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--admin-outline-variant)', pointerEvents: 'none',
            }}
          />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            style={{ paddingLeft: '1.75rem', fontSize: '0.75rem' }}
          />
        </div>
      </div>

      {!r2Configured && (
        <p
          className="italic"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            color: 'var(--admin-on-surface-variant)',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          R2 isn&apos;t configured — uploads are disabled. Paste a URL above.
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.7rem',
            color: 'var(--admin-error)',
            background: 'var(--admin-rose-fixed)',
            padding: '0.375rem 0.5rem',
            borderRadius: '0.25rem',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
