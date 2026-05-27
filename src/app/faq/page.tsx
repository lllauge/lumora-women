import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import FaqContent from '@/components/faq/FaqContent'

export const metadata: Metadata = {
  title: 'FAQ | Lumora Women',
  description: 'Answers to the most common questions about Lumora Women courses, community, and wellness programs.',
}

export default function FaqPage() {
  return (
    <>
      <NavbarWrapper />
      <FaqContent />
      <FooterWrapper />
    </>
  )
}
