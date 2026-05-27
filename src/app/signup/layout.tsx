import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account | Lumora Women',
  description: 'Join Lumora Women — create your free account to access wellness courses and community.',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
