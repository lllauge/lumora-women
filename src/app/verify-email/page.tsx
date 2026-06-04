import type { Metadata } from 'next'
import Link from 'next/link'
import AuthCard from '@/components/layout/AuthCard'
import ResendConfirmationForm from '@/components/auth/ResendConfirmationForm'

export const metadata: Metadata = {
  title: 'Verify Your Email | Lumora Women',
}

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Check Your Email"
      subtitle="One more step before you can access your courses."
    >
      <div className="text-center space-y-5">
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--sage-green-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            fontSize: '2rem',
          }}
        >
          📧
        </div>

        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.7 }}>
          We sent a verification link to your email address. Click the link in that email to activate your account and access your courses.
        </p>

        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
          Didn&apos;t receive it? Check your spam folder, then send yourself a new secure link below.
        </p>

        <ResendConfirmationForm />

        <Link
          href="/"
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant)',
            textDecoration: 'underline',
          }}
        >
          Return to homepage
        </Link>
      </div>
    </AuthCard>
  )
}
