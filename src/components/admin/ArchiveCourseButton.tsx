'use client'

import { useTransition } from 'react'
import { Archive, Loader2 } from 'lucide-react'
import { archiveCourse } from '@/app/actions/admin-courses'

export default function ArchiveCourseButton({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const confirmed = window.confirm(
      `Archive "${courseTitle}"?\n\n` +
        `This will unpublish it from the public catalogue. ` +
        `Existing enrollments are preserved. You can republish later from /admin/courses.`
    )
    if (!confirmed) return

    const fd = new FormData()
    fd.append('id', courseId)
    startTransition(async () => {
      const result = await archiveCourse(fd)
      if (result.error) {
        window.alert(`Could not archive: ${result.error}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title="Archive"
      aria-label={`Archive ${courseTitle}`}
      className="p-1.5 rounded transition-colors disabled:opacity-50"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: pending ? 'wait' : 'pointer',
        color: 'var(--admin-on-surface-variant)',
      }}
      onMouseEnter={(e) => { if (!pending) e.currentTarget.style.color = 'var(--admin-error)' }}
      onMouseLeave={(e) => { if (!pending) e.currentTarget.style.color = 'var(--admin-on-surface-variant)' }}
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
    </button>
  )
}
