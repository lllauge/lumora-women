import type { Metadata } from 'next'
import Link from 'next/link'
import Stripe from 'stripe'
import { CheckCircle, CircleAlert } from 'lucide-react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { fulfillCoachingCheckout } from '@/lib/stripe-coaching-fulfillment'

export const metadata: Metadata = {
  title: 'Coaching Payment Confirmed',
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ session_id?: string }>
}

async function confirm(sessionId: string | undefined) {
  if (!sessionId) {
    return { ok: false, title: 'Checkout Missing', message: 'We could not find your coaching checkout session.' }
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return { ok: false, title: 'Payment Verification Unavailable', message: 'Stripe is not configured.' }
  }

  const stripe = new Stripe(stripeKey)
  // Emailed checkout links arrive truncated or mangled often enough that a
  // bad session id must land on this friendly card, never an error page.
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })
  } catch (err) {
    console.error('[coaching confirmation] session lookup failed:', err instanceof Error ? err.message : err)
    return {
      ok: false,
      title: 'Payment Link Problem',
      message: 'We could not verify this checkout link. If you just paid, your payment is safe — write to hello@lumorawomen.com and Laura will confirm your access.',
    }
  }

  const fulfilled = await fulfillCoachingCheckout(session)
  if (!fulfilled.ok) {
    return { ok: false, title: 'Access Could Not Be Confirmed', message: fulfilled.error }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = await createAdminClient()
  const email = fulfilled.email.toLowerCase()

  if (user?.email?.toLowerCase() === email) {
    await admin
      .from('coaching_clients')
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq('email', email)
      .is('user_id', null)

    return {
      ok: true,
      title: 'Your Coaching Access Is Ready',
      message: 'Your payment is confirmed. Complete your onboarding so I can build your plan.',
      ctaHref: '/coaching/onboarding',
      ctaLabel: 'Start Onboarding',
    }
  }

  return {
    ok: true,
    title: 'Payment Confirmed',
    message: `Your coaching access is attached to ${email}. Create an account or log in with that same email to begin onboarding.`,
    ctaHref: `/signup?email=${encodeURIComponent(email)}&redirectTo=${encodeURIComponent('/coaching/onboarding')}`,
    ctaLabel: 'Create Account',
    secondaryHref: `/login?redirectTo=${encodeURIComponent('/coaching/onboarding')}`,
  }
}

export default async function CoachingConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const result = await confirm(params.session_id)
  const Icon = result.ok ? CheckCircle : CircleAlert

  return (
    <main id="main-content" className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--warm-white)' }}>
      <Link href="/" className="mb-12">
        <span className="gold-text" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          Lumora Women
        </span>
      </Link>

      <div className="w-full max-w-md rounded-2xl p-10 text-center" style={{
        background: '#FFFFFF',
        border: '1px solid var(--outline-variant)',
        boxShadow: '0 4px 24px -4px rgba(61,43,36,0.10)',
      }}>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{
          background: result.ok ? 'var(--section-tint)' : 'rgba(226, 194, 198, 0.35)',
        }}>
          <Icon className="w-10 h-10" style={{ color: result.ok ? 'var(--botanical-green)' : 'var(--warm-terracotta)' }} aria-hidden="true" />
        </div>

        <h1 className="mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--deep-earth)', fontWeight: 600 }}>
          {result.title}
        </h1>
        <p className="mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--on-surface-variant)', lineHeight: 1.7 }}>
          {result.message}
        </p>

        {'ctaHref' in result && typeof result.ctaHref === 'string' && (
          <Link href={result.ctaHref} className="btn-primary" style={{ borderRadius: '0.5rem', padding: '0.9rem 2rem', width: '100%', justifyContent: 'center' }}>
            {result.ctaLabel}
          </Link>
        )}
        {'secondaryHref' in result && result.secondaryHref && (
          <Link href={result.secondaryHref} style={{ display: 'block', marginTop: '1rem', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            I already have an account
          </Link>
        )}
      </div>
    </main>
  )
}
