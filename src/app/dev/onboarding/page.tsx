import { notFound } from 'next/navigation'
import OnboardingView, { type OnboardingLang } from '@/components/coaching/OnboardingView'

// Dev-only harness: renders the coaching onboarding form without a client
// login so copy and layout can be checked in both languages. Pass ?lang=es
// for the Spanish version and &submitted=1 for the confirmation card.
// Submitting from here just bounces to the login page. 404s in production.
export default async function OnboardingPreview({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; submitted?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()

  const params = await searchParams
  const lang: OnboardingLang = params.lang === 'es' ? 'es' : 'en'

  return (
    <OnboardingView
      lang={lang}
      email="preview@example.com"
      submitted={params.submitted === '1'}
      basePath="/dev/onboarding"
    />
  )
}
