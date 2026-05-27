'use client'

import { useTransition } from 'react'
import { Archive, Loader2 } from 'lucide-react'
import { archiveProduct } from '@/app/actions/admin-shop'

export default function ArchiveProductButton({
  productId,
  productName,
}: {
  productId: string
  productName: string
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Archive "${productName}"?\n\nThis hides it from the public shop. You can republish later from the product editor.`)) return
    const fd = new FormData()
    fd.append('id', productId)
    startTransition(async () => {
      const result = await archiveProduct(fd)
      if (!result.ok) window.alert(`Could not archive: ${result.error}`)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Archive ${productName}`}
      title="Archive"
      className="p-1.5 rounded transition-colors disabled:opacity-50"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: pending ? 'wait' : 'pointer',
        color: 'var(--admin-on-surface-variant)',
      }}
      onMouseEnter={(e) => { if (!pending) e.currentTarget.style.color = 'var(--admin-error)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--admin-on-surface-variant)' }}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
    </button>
  )
}
