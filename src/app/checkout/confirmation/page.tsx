import type { Metadata } from 'next'
import Link from 'next/link'
import Stripe from 'stripe'
import { AlertCircle, CheckCircle, LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fulfillPaidCourseCheckout } from '@/lib/stripe-fulfillment'

export const metadata: Metadata = {
  title: 'Purchase Confirmed | Lumora Women',
}

type PageProps = {
  searchParams: Promise<{ session_id?: string }>
}

async function confirmCheckout(sessionId: string | undefined) {
  if (!sessionId) {
    return {
      status: 'missing' as const,
      title: 'Checkout Session Missing',
      message: 'We could not find the Stripe checkout session for this purchase.',
    }
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return {
      status: 'error' as const,
      title: 'Payment Verification Unavailable',
      message: 'Stripe is not configured. Please contact support so we can confirm your access.',
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'login' as const,
      title: 'Log In to Finish Access',
      message: 'Your payment may be complete, but you need to log in so we can attach the course to your account.',
    }
  }

  try {
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })

    const result = await fulfillPaidCourseCheckout(session, user.id)
    if (!result.ok) {
      return {
        status: result.status === 409 ? 'processing' as const : 'error' as const,
        title: result.status === 409 ? 'Payment Still Processing' : 'Access Could Not Be Confirmed',
        message: result.error,
      }
    }

    return {
      status: 'success' as const,
      title: 'Welcome to Lumora Women',
      message: 'Your purchase is confirmed and your course access is live.',
    }
  } catch (err) {
    console.error('[checkout confirmation] failed:', err)
    return {
      status: 'error' as const,
      title: 'Access Could Not Be Confirmed',
      message: 'Your payment may have gone through, but we could not verify it yet. Please contact support if your course does not appear.',
    }
  }
}

export default async function CheckoutConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const result = await confirmCheckout(params.session_id)
  const isSuccess = result.status === 'success'
  const isProcessing = result.status === 'processing'
  const isLogin = result.status === 'login'
  const loginHref = `/login?redirectTo=${encodeURIComponent(
    `/checkout/confirmation${params.session_id ? `?session_id=${params.session_id}` : ''}`
  )}`

  const Icon = isSuccess ? CheckCircle : isProcessing ? LoaderCircle : AlertCircle

  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--warm-white)' }}
    >
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
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{
            background: isSuccess ? 'var(--sage-green-light)' : 'rgba(226, 194, 198, 0.35)',
          }}
        >
          <Icon
            className="w-10 h-10"
            style={{ color: isSuccess ? 'var(--sage-green-dark)' : 'var(--warm-terracotta)' }}
            aria-hidden="true"
          />
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
          {result.title}
        </h1>

        <p
          className="mb-8 leading-relaxed"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            color: 'var(--on-surface-variant)',
            lineHeight: 1.7,
          }}
        >
          {result.message}
        </p>

        <Link
          href={isLogin ? loginHref : '/dashboard'}
          className="btn-primary"
          style={{ borderRadius: '0.5rem', padding: '0.9rem 2rem', width: '100%', justifyContent: 'center' }}
        >
          {isLogin ? 'Log In' : isSuccess ? 'Start Learning →' : 'Go to My Dashboard'}
        </Link>

        <Link
          href="/courses"
          style={{
            display: 'block',
            marginTop: '1rem',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant)',
            textDecoration: 'none',
          }}
        >
          Browse more courses
        </Link>
      </div>
    </main>
  )
}
