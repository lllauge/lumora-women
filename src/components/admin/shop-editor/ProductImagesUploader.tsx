'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Link as LinkIcon, Loader2, X } from 'lucide-react'
import type { UploadProductImageResult } from '@/app/actions/admin-shop'

export default function ProductImagesUploader({
  images,
  onChange,
  uploadImage,
  r2Configured,
}: {
  images: string[]
  onChange: (next: string[]) => void
  uploadImage: (file: File) => Promise<UploadProductImageResult>
  r2Configured: boolean
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [pasteUrl, setPasteUrl] = useState('')

  function handleFile(file: File) {
    setError(null)
    startTransition(async () => {
      const result = await uploadImage(file)
      if (!result.ok) setError(result.error)
      else onChange([...images, result.url])
    })
  }

  function addPasted() {
    const v = pasteUrl.trim()
    if (!v) return
    onChange([...images, v])
    setPasteUrl('')
  }

  function removeAt(idx: number) {
    onChange(images.filter((_, i) => i !== idx))
  }

  function move(idx: number, direction: -1 | 1) {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= images.length) return
    const next = [...images]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    onChange(next)
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

      {/* Existing images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative aspect-square rounded-lg overflow-hidden group"
              style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span
                  className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px]"
                  style={{
                    background: 'var(--admin-primary-container)',
                    color: 'var(--admin-bg)',
                    fontFamily: 'var(--font-hanken)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  Primary
                </span>
              )}
              <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                   style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 40%, transparent 60%, rgba(0,0,0,0.5))' }}>
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move left"
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white disabled:opacity-30 text-xs"
                      style={{ background: 'rgba(0,0,0,0.6)', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === images.length - 1}
                      aria-label="Move right"
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white disabled:opacity-30 text-xs"
                      style={{ background: 'rgba(0,0,0,0.6)', border: 'none', cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ›
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    aria-label="Remove image"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={pending || !r2Configured}
        title={!r2Configured ? 'R2 not configured — paste a URL below' : 'Upload an image'}
        className="w-full flex flex-col items-center justify-center py-6 rounded-lg transition-colors"
        style={{
          background: 'var(--admin-surface-low)',
          border: '2px dashed var(--admin-outline-variant)',
          color: r2Configured ? 'var(--admin-on-surface-variant)' : 'var(--admin-outline-variant)',
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: pending ? 'wait' : (!r2Configured ? 'not-allowed' : 'pointer'),
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
          style={{ background: r2Configured ? 'var(--admin-sage-container)' : 'var(--admin-surface-container)' }}
        >
          {pending
            ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--admin-primary-container)' }} />
            : <ImagePlus size={18} style={{ color: r2Configured ? 'var(--admin-primary-container)' : 'var(--admin-outline-variant)' }} />}
        </div>
        <span>{pending ? 'Uploading…' : `Upload image${images.length > 0 ? '' : ' (first becomes the primary)'}`}</span>
      </button>

      {/* URL paste fallback */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon
            size={12}
            style={{
              position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--admin-outline-variant)', pointerEvents: 'none',
            }}
          />
          <input
            type="url"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder={r2Configured ? 'Or paste an image URL…' : 'Paste an image URL…'}
            style={{ paddingLeft: '1.75rem', fontSize: '0.8125rem' }}
          />
        </div>
        <button
          type="button"
          onClick={addPasted}
          disabled={!pasteUrl.trim()}
          className="admin-btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
        >
          Add URL
        </button>
      </div>

      {!r2Configured && (
        <p
          className="italic"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.7rem',
            color: 'var(--admin-on-surface-variant)',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          R2 isn&apos;t configured — uploads are disabled. Paste URLs above to add images.
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
