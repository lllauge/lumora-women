import Link from 'next/link'

interface Props {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthCard({ children, title, subtitle }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'var(--page-bg)' }}
    >
      {/* Logo */}
      <Link href="/" className="mb-8 block">
        <span
          className="gold-text"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          Lumora Women
        </span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 4px 24px -4px rgba(26,40,24,0.10)',
          border: '1px solid rgba(200,220,192,0.35)',
        }}
      >
        {/* Gold top line */}
        <div style={{ height: '3px', background: 'linear-gradient(to right, #F0D060 0%, #C8980A 25%, #E8C040 50%, #A87808 75%, #D4AC30 100%)' }} />
        <div className="p-8 sm:p-10">
          <h1
            className="mb-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.875rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mb-8"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9375rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
