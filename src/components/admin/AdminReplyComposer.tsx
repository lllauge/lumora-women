'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { sendCoachReply } from '@/app/actions/admin-messages'

export default function AdminReplyComposer({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await sendCoachReply(formData)
      if (!result.ok) {
        setError(result.error ?? 'Could not send. Please try again.')
        return
      }
      formRef.current?.reset()
      router.refresh()
    })
  }

  return (
    <form ref={formRef} action={onSubmit}>
      <input type="hidden" name="clientId" value={clientId} />
      <div
        className="flex items-end gap-2"
        style={{
          background: '#FFFFFF', border: '1px solid var(--admin-outline-variant)',
          borderRadius: '1rem', padding: '0.5rem 0.5rem 0.5rem 1rem',
        }}
      >
        <label htmlFor="admin-reply" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Reply to {clientName}
        </label>
        <textarea
          id="admin-reply"
          name="body"
          rows={1}
          required
          maxLength={4000}
          placeholder={`Reply to ${clientName}…`}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`
          }}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            fontFamily: 'var(--font-hanken)', fontSize: '0.9rem', color: 'var(--admin-on-surface)',
            background: 'transparent', lineHeight: 1.5, padding: '0.375rem 0', maxHeight: '160px',
          }}
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send reply"
          style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: 0,
            background: 'var(--botanical-green)', border: 'none',
            cursor: pending ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: pending ? 0.6 : 1,
          }}
        >
          <Send style={{ width: '1rem', height: '1rem', color: '#FFFFFF' }} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', color: '#A32D2D', marginTop: '0.375rem' }}>
          {error}
        </p>
      )}
    </form>
  )
}
