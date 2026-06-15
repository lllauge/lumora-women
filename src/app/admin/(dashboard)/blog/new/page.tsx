import type { Metadata } from 'next'
import BlogPostEditor from '@/components/admin/blog-editor/BlogPostEditor'
import { isR2Configured } from '@/lib/r2'
import { isSchedulingAvailable } from '@/lib/blog-schema'

export const metadata: Metadata = {
  title: 'New Blog Post',
  robots: { index: false, follow: false },
}

export default async function NewBlogPostPage() {
  return (
    <BlogPostEditor
      mode="new"
      r2Configured={isR2Configured()}
      schedulingAvailable={await isSchedulingAvailable()}
      initial={{
        title: '',
        slug: '',
        body: '',
        category: null,
        featured_image_url: null,
        meta_description: null,
        published: false,
        published_at: null,
        scheduled_at: null,
      }}
    />
  )
}
