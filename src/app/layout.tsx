import type { Metadata, Viewport } from 'next'
import './globals.css'

// viewport-fit=cover activates env(safe-area-inset-*) on iPhones, which the
// coaching portal's fixed bottom tab bar depends on — without it the inset is
// 0 and the bar visibly rides Safari's collapsing toolbar while scrolling.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}
import AxeProvider from '@/components/dev/AxeProvider'
import IdleSessionGuard from '@/components/auth/IdleSessionGuard'

export const metadata: Metadata = {
  title: {
    default: "Lumora Women | Postpartum Wellness & Women's Health",
    template: '%s | Lumora Women',
  },
  description: "Practical wellness education for women navigating postpartum recovery, hormone health, and every season of womanhood.",
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Lumora Women',
    statusBarStyle: 'default',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#1E3220" />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-nav">Skip to main content</a>
        <IdleSessionGuard />
        {children}
        <AxeProvider />
      </body>
    </html>
  )
}
