import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Purchase Confirmed | Lumora Women',
}

export default function CheckoutConfirmationPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--warm-white)' }}
    >
      {/* Logo */}
      <Link href="/" className="mb-12">
        <span className="gold-text" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          Lumora Women
        </span>
      </Link>

      <div
        className="w-full max-w-md rounded-2xl p-10 text-center"
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--outline-variant)',
          boxShadow: '0 4px 24px -4px rgba(61,43,36,0.10)',
        }}
      >
        {/* Check icon */}
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ background: 'var(--sage-green-light)' }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: 'var(--sage-green-dark)' }} aria-hidden="true" />
        </div>

        <h1
          className="mb-3"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            color: 'var(--deep-earth)',
            fontWeight: 600,
          }}
        >
          Welcome to Lumora Women
        </h1>

        <p
          className="mb-3 leading-relaxed"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            color: 'var(--on-surface-variant)',
            lineHeight: 1.7,
          }}
        >
          Your purchase is confirmed. Check your inbox for a receipt and your access details. Your course is ready to start right now.
        </p>

        <p
          className="mb-8"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant)',
          }}
        >
          A receipt has been sent to your email.
        </p>

        <Link
          href="/dashboard"
          className="btn-primary"
          style={{ borderRadius: '0.5rem', padding: '0.9rem 2rem', width: '100%', justifyContent: 'center' }}
        >
          Start Learning →
        </Link>

        <Link
          href="/courses"
          style={{
            display: 'block', marginTop: '1rem',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
            color: 'var(--on-surface-variant)', textDecoration: 'none',
          }}
        >
          Browse more courses
        </Link>
      </div>
    </main>
  )
}
