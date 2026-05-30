import type { Metadata } from 'next'
import './globals.css'
import AxeProvider from '@/components/dev/AxeProvider'

export const metadata: Metadata = {
  title: {
    default: "Lumora Women | Postpartum Wellness & Women's Health",
    template: '%s | Lumora Women',
  },
  description: "Practical wellness education for women navigating postpartum recovery, hormone health, and every season of womanhood.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-nav">Skip to main content</a>
        {children}
        <AxeProvider />
      </body>
    </html>
  )
}
