import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Work With Me | Lumora Women',
}

export default function WorkWithMeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
