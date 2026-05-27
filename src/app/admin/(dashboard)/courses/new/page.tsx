import type { Metadata } from 'next'
import CourseEditor from '@/components/admin/course-editor/CourseEditor'
import { isR2Configured } from '@/lib/r2'
import { isStreamConfigured } from '@/lib/cloudflare-stream'

export const metadata: Metadata = {
  title: 'Create New Course',
  robots: { index: false, follow: false },
}

export default function NewCoursePage() {
  return (
    <CourseEditor
      mode="new"
      r2Configured={isR2Configured()}
      streamConfigured={isStreamConfigured()}
      initial={{
        title: '',
        subtitle: '',
        description: '',
        price: 0,
        is_free: false,
        thumbnail_url: '',
        modules: [],
      }}
    />
  )
}
