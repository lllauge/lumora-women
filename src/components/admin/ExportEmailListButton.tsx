'use client'

import { useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { exportEmailListCSV } from '@/app/actions/admin-email-list'

export default function ExportEmailListButton() {
  const [pending, startTransition] = useTransition()
  const searchParams = useSearchParams()

  function handleClick() {
    const q = searchParams?.get('q') ?? ''
    startTransition(async () => {
      const result = await exportEmailListCSV({ q })
      if (!result.ok) {
        window.alert(`Could not export: ${result.error}`)
        return
      }
      // Build a Blob and click an invisible link to trigger the download
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="admin-btn-secondary"
      style={{ cursor: pending ? 'wait' : 'pointer' }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      <span>{pending ? 'Preparing…' : 'Export CSV'}</span>
    </button>
  )
}
