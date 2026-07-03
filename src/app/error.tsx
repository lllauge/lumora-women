'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ background: '#F8F6F0', fontFamily: 'DM Sans, system-ui, sans-serif', margin: 0 }}>
        <a href="#main-content" style={{
          position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px',
          overflow: 'hidden', zIndex: 9999,
          fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: '0.875rem', fontWeight: 600,
          padding: '0.75rem 1.5rem', background: '#162814', color: '#C8980A', textDecoration: 'none',
          borderRadius: '0 0 0.5rem 0.5rem',
        }}
          onFocus={(e) => {
            e.currentTarget.style.position = 'fixed'
            e.currentTarget.style.left = '0.5rem'
            e.currentTarget.style.top = '0'
            e.currentTarget.style.width = 'auto'
            e.currentTarget.style.height = 'auto'
          }}
          onBlur={(e) => {
            e.currentTarget.style.position = 'absolute'
            e.currentTarget.style.left = '-9999px'
          }}
        >
          Skip to main content
        </a>
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

          {/* 500 indicator */}
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
            500
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
            Something Went Wrong
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
            We&apos;re sorry, an unexpected error occurred. Please try again. If the problem persists, contact us at{' '}
            <a
              href="mailto:hello@lumorawomen.com"
              style={{ color: 'var(--botanical-green)', textDecoration: 'underline' }}
            >
              hello@lumorawomen.com
            </a>
            .
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
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
                border: 'none',
                cursor: 'pointer',
                minHeight: '44px',
                textDecoration: 'none',
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                color: '#1E3220',
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 500,
                fontSize: '0.9375rem',
                padding: '0.875rem 2.5rem',
                borderRadius: '9999px',
                border: '1.5px solid #1E3220',
                textDecoration: 'none',
                minHeight: '44px',
              }}
            >
              Go to Homepage
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
