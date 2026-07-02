import type { Metadata } from 'next'
import AdminLoginForm from '@/components/admin/AdminLoginForm'

export const metadata: Metadata = {
  title: 'Admin Access',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ error?: string }>

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams
  const initialError =
    error === 'unauthorized'
      ? 'This account does not have admin access.'
      : error === 'inactive'
        ? 'You were signed out after 30 minutes without activity. Please log in again.'
      : undefined

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--admin-primary-container)' }}
    >
      <main id="main-content" className="w-full max-w-md">

        {/* Logo / Brand block */}
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
              L
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
            Lumora Admin
          </h1>
          <p
            className="mt-2 uppercase"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: 'rgba(184, 137, 137, 0.7)',
            }}
          >
            Admin Access Only
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-xl p-6 border space-y-6"
          style={{
            background: 'rgba(0, 30, 20, 0.45)',
            borderColor: 'rgba(124, 156, 141, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <AdminLoginForm initialError={initialError} />
        </div>

        {/* Status indicator */}
        <div className="mt-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border"
            style={{
              background: 'rgba(124, 156, 141, 0.05)',
              borderColor: 'rgba(124, 156, 141, 0.15)',
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: 'var(--admin-celadon)' }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: 'var(--admin-celadon)' }}
              />
            </span>
            <span
              className="uppercase"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.15em',
                color: 'rgba(124, 156, 141, 0.6)',
              }}
            >
              Secure Terminal Active
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
