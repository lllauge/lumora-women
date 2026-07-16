import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import OnboardingView, { type OnboardingLang } from '@/components/coaching/OnboardingView'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Coaching Onboarding',
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ submitted?: string; lang?: string }>
}

async function getPaidClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login?redirectTo=/coaching/onboarding')

  const admin = await createAdminClient()
  const email = user.email.toLowerCase()
  const { data: client } = await admin
    .from('coaching_clients')
    .select('id, user_id, email, first_name, last_name, onboarding_status')
    .eq('email', email)
    .maybeSingle()

  if (!client) redirect('/work-with-me')

  if (!client.user_id) {
    await admin
      .from('coaching_clients')
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq('id', client.id)
  }

  return { client, user }
}

export default async function CoachingOnboardingPage({ searchParams }: PageProps) {
  const [params, { client, user }] = await Promise.all([searchParams, getPaidClient()])
  const lang: OnboardingLang = params.lang === 'es' ? 'es' : 'en'
  const submitted = params.submitted === '1' || client.onboarding_status === 'submitted'

  return <OnboardingView lang={lang} email={user.email ?? ''} submitted={submitted} />
}
