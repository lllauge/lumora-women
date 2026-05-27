import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import BlogContent from '@/components/blog/BlogContent'

export const metadata: Metadata = {
  title: 'The Journal | Lumora Women',
  description: 'Deep dives into holistic health, conscious living, and the art of modern sanctuary.',
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
