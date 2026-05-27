'use client'

import { useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteBlogPost } from '@/app/actions/admin-blog'

export default function DeleteBlogPostButton({
  postId,
  postTitle,
}: {
  postId: string
  postTitle: string
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const confirmed = window.confirm(
      `Delete "${postTitle}"?\n\n` +
        `This will permanently remove the post — it cannot be undone. ` +
        `If you'd rather just hide it, edit the post and toggle Publish off instead.`
    )
    if (!confirmed) return

    const fd = new FormData()
    fd.append('id', postId)
    startTransition(async () => {
      const result = await deleteBlogPost(fd)
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
      aria-label={`Delete ${postTitle}`}
      className="p-2 rounded-full transition-colors disabled:opacity-50"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: pending ? 'wait' : 'pointer',
        color: 'var(--admin-error)',
      }}
      onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = 'var(--admin-rose-fixed)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
    </button>
  )
}
