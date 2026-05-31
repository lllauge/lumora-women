import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import BlogContent from '@/components/blog/BlogContent'

export const metadata: Metadata = {
  title: 'Real Talk | Lumora Women',
  description: 'Honest, science-backed conversations about motherhood, hormones, weight loss, energy, and building strength in who you are now.',
}

export default function BlogPage() {
  return (
    <>
      <NavbarWrapper />
      <BlogContent />
      <FooterWrapper />
    </>
  )
}
