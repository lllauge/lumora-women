'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Loader2, UploadCloud, X } from 'lucide-react'
import type { UploadAssetResult } from '@/app/actions/admin-course-editor'
import { newKey, type DownloadDraft } from './types'

export default function DownloadList({
  downloads,
  onChange,
  uploadAsset,
  r2Configured,
}: {
  downloads: DownloadDraft[]
  onChange: (next: DownloadDraft[]) => void
  uploadAsset: (file: File, kind: 'thumbnail' | 'download') => Promise<UploadAssetResult>
  r2Configured: boolean
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleFile(file: File) {
    setError(null)
    startTransition(async () => {
      const result = await uploadAsset(file, 'download')
      if (!result.ok) {
        setError(result.error)
        return
      }
      onChange([
        ...downloads,
        {
          _key: newKey('d'),
          file_name: result.name,
          file_url:  result.url,
          file_type: result.contentType || null,
        },
      ])
    })
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {downloads.length > 0 && (
        <ul className="space-y-1.5">
          {downloads.map((d, idx) => (
            <li
              key={d._key}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-outline-variant)' }}
            >
              <FileText size={14} style={{ color: 'var(--admin-on-surface-variant)', flexShrink: 0 }} />
              <a
                href={d.file_url}
                target="_blank"
                rel="noreferrer"
                title={d.file_url}
                className="flex-1 truncate hover:underline"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.75rem',
                  color: 'var(--admin-on-surface)',
                  textDecoration: 'none',
                }}
              >
                {d.file_name || d.file_url}
              </a>
              <button
                type="button"
                aria-label={`Remove ${d.file_name}`}
                onClick={() => onChange(downloads.filter((_, i) => i !== idx))}
                className="p-0.5"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={pending || !r2Configured}
        title={!r2Configured ? 'R2 not configured — paste a download URL below' : undefined}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors"
        style={{
          background: 'var(--admin-surface)',
          border: '1px dashed var(--admin-outline-variant)',
          color: r2Configured ? 'var(--admin-on-surface-variant)' : 'var(--admin-outline-variant)',
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: pending ? 'wait' : (!r2Configured ? 'not-allowed' : 'pointer'),
        }}
      >
        {pending
          ? <Loader2 size={14} className="animate-spin" />
          : <UploadCloud size={14} />}
        <span>{pending ? 'Uploading…' : 'Upload PDF / Slides'}</span>
      </button>

      {!r2Configured && (
        <UrlOnlyAdder
          onAdd={(name, url) =>
            onChange([
              ...downloads,
              { _key: newKey('d'), file_name: name, file_url: url, file_type: null },
            ])
          }
        />
      )}

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.7rem',
            color: 'var(--admin-error)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}

function UrlOnlyAdder({ onAdd }: { onAdd: (name: string, url: string) => void }) {
  const [name, setName] = useState('')
  const [url, setUrl]   = useState('')

  function tryAdd() {
    const n = name.trim()
    const u = url.trim()
    if (!u) return
    onAdd(n || u.split('/').pop() || 'Download', u)
    setName('')
    setUrl('')
  }

  return (
    <div
      className="grid grid-cols-1 gap-1.5 p-2 rounded"
      style={{ background: 'var(--admin-surface-low)', border: '1px dashed var(--admin-outline-variant)' }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="File name (e.g. Worksheet.pdf)"
        style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem' }}
      />
      <div className="flex gap-1.5">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem', flex: 1 }}
        />
        <button
          type="button"
          onClick={tryAdd}
          disabled={!url.trim()}
          className="admin-btn-secondary"
          style={{
            fontSize: '0.7rem',
            padding: '0.375rem 0.75rem',
            whiteSpace: 'nowrap',
          }}
        >
          Add URL
        </button>
      </div>
    </div>
  )
}
