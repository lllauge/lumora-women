'use client'

import { useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteCourse } from '@/app/actions/admin-courses'

export default function DeleteCourseButton({
  courseId,
  courseTitle,
  enrollmentCount,
}: {
  courseId: string
  courseTitle: string
  enrollmentCount: number
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const confirmed = window.confirm(
      `Permanently delete "${courseTitle}"?\n\n` +
        `This removes the course, modules, lessons, downloads, enrollments, and lesson progress from the database.\n\n` +
        `${enrollmentCount > 0 ? `This course currently has ${enrollmentCount} enrolled student${enrollmentCount === 1 ? '' : 's'}.\n\n` : ''}` +
        `This cannot be undone.`
    )
    if (!confirmed) return

    const typed = window.prompt(`Type DELETE to permanently delete "${courseTitle}".`)
    if (typed !== 'DELETE') return

    const fd = new FormData()
    fd.append('id', courseId)
    startTransition(async () => {
      const result = await deleteCourse(fd)
      if (result.error) {
        window.alert(`Could not delete: ${result.error}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title="Delete permanently"
      aria-label={`Delete ${courseTitle}`}
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
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
    </button>
  )
}
