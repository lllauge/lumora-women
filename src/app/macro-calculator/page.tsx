import type { Metadata } from 'next'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import MacroCalculatorContent from '@/components/macro-calculator/MacroCalculatorContent'

export const metadata: Metadata = {
  title: 'Free Macro Calculator for Women | Lumora Women',
  description:
    'Calculate your calories, protein, carbs, and fat with the same math we use for one on one coaching clients. Built for women, honest about how it works.',
}

export default function MacroCalculatorPage() {
  return (
    <>
      <NavbarWrapper />
      <MacroCalculatorContent />
      <FooterWrapper />
    </>
  )
}
