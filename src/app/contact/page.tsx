import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import ContactContent from '@/components/contact/ContactContent'

export const metadata: Metadata = {
  title: 'Contact | Lumora Women',
  description: 'Get in touch with the Lumora Women team. We\'re here to help.',
}

export default function ContactPage() {
  return (
    <>
      <NavbarWrapper />
      <ContactContent />
      <FooterWrapper />
    </>
  )
}
