'use client'

import { useRef, useState } from 'react'
import { Link as LinkIcon, Loader2, Video, X, CheckCircle } from 'lucide-react'
import { getStreamUploadUrl } from '@/app/actions/admin-course-editor'

export default function VideoUploader({
  value,
  onChange,
  streamConfigured,
}: {
  value: string
  onChange: (url: string) => void
  streamConfigured: boolean
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError]       = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const isStreamValue = value.startsWith('stream:')
  const isUrlValue    = value.startsWith('http')

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file (MP4, MOV, WEBM).')
      return
    }

    setUploading(true)
    setProgress(0)

    // 1. Get one-time TUS upload URL from Cloudflare
    const result = await getStreamUploadUrl()
    if (!result.ok) {
      setError(result.error)
      setUploading(false)
      setProgress(null)
      return
    }

    const { uid, uploadURL } = result

    // 2. Upload directly from browser to Cloudflare via TUS
    const { Upload } = await import('tus-js-client')

    const upload = new Upload(file, {
      uploadUrl: uploadURL,
      chunkSize: 50 * 1024 * 1024, // 50 MB chunks
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onProgress(bytesUploaded, bytesTotal) {
        setProgress(Math.round((bytesUploaded / bytesTotal) * 100))
      },
      onSuccess() {
        onChange(`stream:${uid}`)
        setUploading(false)
        setProgress(null)
      },
      onError(err) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
        setUploading(false)
        setProgress(null)
      },
    })

    upload.start()
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {/* Upload button — shown when no Stream video set yet */}
      {!isStreamValue && (
        <button
          type="button"
          onClick={() => streamConfigured ? fileInput.current?.click() : undefined}
          disabled={uploading || !streamConfigured}
          className="w-full rounded-lg flex items-center justify-center gap-2 transition-colors"
          style={{
            border: '2px dashed var(--admin-outline-variant)',
            background: 'var(--admin-surface)',
            padding: '0.625rem 1rem',
            cursor: uploading ? 'wait' : streamConfigured ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            color: streamConfigured ? 'var(--admin-on-surface-variant)' : 'var(--admin-outline-variant)',
            opacity: streamConfigured ? 1 : 0.6,
          }}
          onMouseEnter={(e) => { if (streamConfigured && !uploading) e.currentTarget.style.borderColor = 'var(--admin-celadon)' }}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--admin-outline-variant)')}
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Uploading to Cloudflare Stream…</span>
            </>
          ) : (
            <>
              <Video size={16} />
              <span>
                {streamConfigured ? 'Upload video to Cloudflare Stream' : 'Upload video (Stream not configured)'}
              </span>
            </>
          )}
        </button>
      )}

      {/* Progress bar */}
      {uploading && progress !== null && (
        <div style={{ background: 'var(--admin-outline-variant)', borderRadius: '999px', overflow: 'hidden', height: '6px' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--admin-celadon)',
              borderRadius: '999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
      {uploading && progress !== null && (
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', textAlign: 'right' }}>
          {progress}%
        </p>
      )}

      {/* Uploaded Stream video preview chip */}
      {isStreamValue && (
        <div
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
          style={{
            background: 'var(--admin-sage-container)',
            border: '1px solid var(--admin-outline-variant)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle size={14} style={{ color: 'var(--admin-celadon)', flexShrink: 0 }} />
            <span
              className="truncate"
              style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface)' }}
            >
              Cloudflare Stream · {value.slice(7).slice(0, 12)}…
            </span>
          </div>
          <button
            type="button"
            onClick={() => { onChange(''); setError(null) }}
            aria-label="Remove video"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--admin-on-surface-variant)', flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* URL fallback input */}
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
          value={isStreamValue ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={streamConfigured ? 'Or paste an external video URL' : 'Paste a video URL'}
          disabled={isStreamValue}
          style={{
            paddingLeft: '2rem',
            background: 'var(--admin-surface)',
            fontSize: '0.8125rem',
            opacity: isStreamValue ? 0.4 : 1,
          }}
        />
      </div>

      {!streamConfigured && (
        <p
          className="italic"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
            lineHeight: 1.4,
          }}
        >
          Cloudflare Stream not configured — add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_TOKEN to enable uploads.
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
