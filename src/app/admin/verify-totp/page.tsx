import type { Metadata } from 'next'
import TotpVerifyForm from '@/components/admin/TotpVerifyForm'

export const metadata: Metadata = {
  title: 'Two-Factor Authentication',
  robots: { index: false, follow: false },
}

export default function VerifyTotpPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--admin-primary-container)' }}
    >
      <main id="main-content" className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border"
            style={{
              background: 'rgba(124, 156, 141, 0.10)',
              borderColor: 'rgba(124, 156, 141, 0.30)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '2rem',
                fontWeight: 500,
                color: 'var(--admin-celadon)',
              }}
            >
              🔐
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.75rem',
              fontWeight: 500,
              color: 'var(--admin-celadon-pale)',
              letterSpacing: '-0.01em',
            }}
          >
            Two-Factor Authentication
          </h1>
          <p
            className="mt-2 text-center"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.875rem',
              color: 'rgba(184, 137, 137, 0.8)',
              maxWidth: '22rem',
            }}
          >
            Enter the 6-digit code from your authenticator app to continue.
          </p>
        </div>

        <div
          className="rounded-xl p-6 border"
          style={{
            background: 'rgba(0, 30, 20, 0.45)',
            borderColor: 'rgba(124, 156, 141, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <TotpVerifyForm />
        </div>
      </main>
    </div>
  )
}
