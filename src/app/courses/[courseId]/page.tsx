import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import CourseDetailContent from '@/components/courses/CourseDetailContent'

export const metadata: Metadata = {
  title: 'Course | Lumora Women',
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  return (
    <>
      <NavbarWrapper />
      <CourseDetailContent courseId={courseId} />
      <FooterWrapper />
    </>
  )
}
