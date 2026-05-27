import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import CoursesContent from '@/components/courses/CoursesContent'

export const metadata: Metadata = {
  title: 'Courses | Lumora Women',
  description: 'Expert-led wellness courses for postpartum recovery, hormone health, and conscious living.',
}

export default function CoursesPage() {
  return (
    <>
      <NavbarWrapper />
      <CoursesContent />
      <FooterWrapper />
    </>
  )
}
