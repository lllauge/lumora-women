import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout | Lumora Women',
  description: 'Complete your course purchase securely.',
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
