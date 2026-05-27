import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import CommunityContent from '@/components/community/CommunityContent'

export const metadata: Metadata = {
  title: 'Community | Lumora Women',
  description: 'Join the Lumora Women inner circle — a private community of women supporting each other through wellness, healing, and growth.',
}

export default function CommunityPage() {
  return (
    <>
      <NavbarWrapper />
      <CommunityContent />
      <FooterWrapper />
    </>
  )
}
