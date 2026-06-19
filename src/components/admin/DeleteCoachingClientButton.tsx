'use client'

import { useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteCoachingClient } from '@/app/actions/admin-coaching'

export default function DeleteCoachingClientButton({
  id,
  label,
}: {
  id: string
  label: string
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(
      `Delete coaching client ${label}?\n\nThis removes their onboarding, plan, messages, daily logs, and progress logs. The order record is preserved. This cannot be undone.`
    )) return
    const fd = new FormData()
    fd.append('id', id)
    startTransition(async () => {
      const result = await deleteCoachingClient(fd)
      if (!result.ok) window.alert(`Could not delete: ${result.error}`)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Delete ${label}`}
      title="Delete client"
      className="p-2 rounded-full transition-colors disabled:opacity-50"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: pending ? 'wait' : 'pointer',
        color: 'var(--admin-on-surface-variant)',
      }}
      onMouseEnter={(e) => { if (!pending) e.currentTarget.style.color = 'var(--admin-error)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--admin-on-surface-variant)' }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  )
}
