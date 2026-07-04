import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import BlogContent from '@/components/blog/BlogContent'
import { publishDueBlogPosts } from '@/lib/blog-scheduling'

export const metadata: Metadata = {
  title: 'Real Talk | Lumora Women',
  description: 'Honest, science-backed conversations about motherhood, hormones, weight loss, energy, and building strength in who you are now.',
}

export default async function BlogPage() {
  // Scheduled posts go live at read time; BlogContent's client-side fetch
  // then sees them as published.
  await publishDueBlogPosts()
  return (
    <>
      <NavbarWrapper />
      <BlogContent />
      <FooterWrapper />
    </>
  )
}
