import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Lumora Women',
  description: 'Sign in to your Lumora Women account to access your courses and continue your wellness journey.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
