import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page Not Found | Lumora Women',
  description: 'The page you were looking for could not be found.',
}

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ background: 'var(--page-bg)', fontFamily: 'var(--font-sans)', margin: 0 }}>
        <a href="#main-content" className="skip-nav">Skip to main content</a>
        <main
          id="main-content"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            background: '#F8F6F0',
          }}
        >
          {/* Logo */}
          <Link href="/" aria-label="Lumora Women, home" style={{ marginBottom: '3rem', textDecoration: 'none' }}>
            <span
              style={{
                fontFamily: 'Libre Baskerville, Georgia, serif',
                fontSize: '1.75rem',
                fontWeight: 700,
                background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              aria-hidden="true"
            >
              Lumora Women
            </span>
          </Link>

          {/* 404 indicator */}
          <p
            aria-hidden="true"
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '6rem',
              fontWeight: 700,
              lineHeight: 1,
              background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1.5rem',
            }}
          >
            404
          </p>

          <h1
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              color: '#1A2818',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            Page Not Found
          </h1>

          <p
            style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontSize: '1.0625rem',
              color: '#3A4A38',
              lineHeight: 1.7,
              maxWidth: '36rem',
              marginBottom: '2.5rem',
            }}
          >
            We couldn&apos;t find the page you were looking for. It may have been moved, deleted, or the link may be incorrect.
          </p>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)',
              color: '#1A2818',
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: '0.9375rem',
              padding: '0.875rem 2.5rem',
              borderRadius: '9999px',
              textDecoration: 'none',
              minHeight: '44px',
            }}
          >
            Return to Homepage
          </Link>
        </main>
      </body>
    </html>
  )
}
