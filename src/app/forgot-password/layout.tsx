import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forgot Password | Lumora Women',
  description: 'Reset your Lumora Women account password.',
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
