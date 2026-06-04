import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { submitCoachingOnboarding } from '@/app/actions/coaching-onboarding'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Coaching Onboarding',
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ submitted?: string }>
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

function Field({ name, label, type = 'text', required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        {label}
      </span>
      <input name={name} type={type} required={required} style={{
        width: '100%', minHeight: '44px', borderRadius: '0.5rem',
        border: '1px solid rgba(200,220,192,0.55)', padding: '0.75rem 0.875rem',
        fontFamily: 'var(--font-sans)', background: '#FFFFFF',
      }} />
    </label>
  )
}

function TextArea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        {label}
      </span>
      <textarea name={name} required={required} rows={4} style={{
        width: '100%', borderRadius: '0.5rem',
        border: '1px solid rgba(200,220,192,0.55)', padding: '0.75rem 0.875rem',
        fontFamily: 'var(--font-sans)', background: '#FFFFFF', resize: 'vertical',
      }} />
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4" style={{ borderTop: '1px solid rgba(200,220,192,0.45)', paddingTop: '1.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default async function CoachingOnboardingPage({ searchParams }: PageProps) {
  const [{ submitted }, { client, user }] = await Promise.all([searchParams, getPaidClient()])

  return (
    <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '100vh', padding: '2rem 1rem 5rem' }}>
      <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
        <Link href="/" className="gold-text" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none' }}>
          Lumora Women
        </Link>

        {submitted === '1' || client.onboarding_status === 'submitted' ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(200,220,192,0.45)', marginTop: '3rem' }}>
            <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--botanical-green)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Your onboarding is submitted.
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              I’ll review your information and build your plan.
            </p>
          </div>
        ) : (
          <form action={submitCoachingOnboarding} className="space-y-8 rounded-2xl p-6 md:p-8" style={{ background: '#FFFFFF', border: '1px solid rgba(200,220,192,0.45)', marginTop: '3rem' }}>
            <input type="hidden" name="email" value={user.email ?? ''} />

            <Section title="Personal Information">
              <div className="grid md:grid-cols-2 gap-4">
                <Field name="firstName" label="First name" required />
                <Field name="lastName" label="Last name" required />
                <Field name="phone" label="Phone" />
                <Field name="timezone" label="Time zone" required />
              </div>
            </Section>

            <Section title="Goals & Body Data">
              <div className="grid md:grid-cols-2 gap-4">
                <Field name="height" label="Height" required />
                <Field name="weight" label="Current weight" required />
                <Field name="targetWeight" label="Goal weight, if any" />
                <Field name="waist" label="Waist measurement, optional" />
                <Field name="hips" label="Hip measurement, optional" />
              </div>
              <TextArea name="primaryGoal" label="What is your main goal?" required />
              <TextArea name="whyNow" label="Why now?" required />
              <TextArea name="success" label="What would success look like in 12 weeks?" required />
            </Section>

            <Section title="Health & Lifestyle">
              <TextArea name="medicalConditions" label="Medical conditions or important health history" />
              <TextArea name="medications" label="Medications or supplements" />
              <TextArea name="injuries" label="Injuries or movement limitations" />
              <TextArea name="eatingDisorderHistory" label="History of eating disorder, extreme restriction, or binge/restrict cycles" />
              <div className="grid md:grid-cols-2 gap-4">
                <Field name="sleep" label="Average sleep" />
                <Field name="stress" label="Stress level 1-10" />
              </div>
            </Section>

            <Section title="Nutrition">
              <TextArea name="currentEating" label="Describe a normal day of eating" required />
              <TextArea name="trackingExperience" label="Experience tracking calories/macros" />
              <TextArea name="allergies" label="Food allergies" />
              <TextArea name="restrictions" label="Dietary restrictions" />
              <TextArea name="favoriteFoods" label="Favorite foods" />
              <TextArea name="dislikedFoods" label="Foods you dislike/refuse to eat" />
              <div className="grid md:grid-cols-3 gap-4">
                <Field name="eatingOut" label="Eating out frequency" />
                <Field name="water" label="Water intake" />
                <Field name="caffeine" label="Caffeine intake" />
              </div>
            </Section>

            <Section title="Schedule & Accountability">
              <TextArea name="workSchedule" label="Work/family schedule" />
              <TextArea name="workouts" label="Current workouts and equipment access" />
              <Field name="steps" label="Average daily steps, if known" />
              <TextArea name="barriers" label="Biggest barriers" />
              <TextArea name="accountability" label="What kind of accountability helps you most?" />
            </Section>

            <Section title="Agreements">
              <label className="flex gap-3 items-start" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="notMedicalCare" required style={{ marginTop: '0.25rem' }} />
                I understand this is coaching and education, not medical nutrition therapy or medical care.
              </label>
              <label className="flex gap-3 items-start" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="notPregnantBreastfeeding" required style={{ marginTop: '0.25rem' }} />
                I confirm I am not currently pregnant or breastfeeding.
              </label>
              <label className="flex gap-3 items-start" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="terms" required style={{ marginTop: '0.25rem' }} />
                I understand my plan will be created after Laura reviews my onboarding information.
              </label>
            </Section>

            <button type="submit" className="btn-primary" style={{ borderRadius: '0.5rem', width: '100%', justifyContent: 'center', padding: '1rem 2rem' }}>
              Submit Onboarding
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
