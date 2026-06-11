import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, CircleAlert } from 'lucide-react'
import CoachingPlanEditor from '@/components/admin/CoachingPlanEditor'
import CoachingProgressTracker from '@/components/admin/CoachingProgressTracker'
import { parseCoachingPlan } from '@/lib/coaching-plan-schema'
import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatShortDate } from '@/utils/format'

export const metadata: Metadata = {
  title: 'Coaching Client',
  robots: { index: false, follow: false },
}

type PageProps = {
  params: Promise<{ clientId: string }>
}

type CoachingClient = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  onboarding_status: string
  paid_at: string | null
  coaching_order_id: string | null
  created_at: string
}

type CoachingOrder = {
  amount: number | string | null
  stripe_session_id: string | null
  status: string
  created_at: string
}

type OnboardingRow = {
  form_data: unknown
  submitted_at: string | null
  updated_at: string
}

type PlanRow = {
  planning_inputs: unknown
  macro_targets: unknown
  meal_plan: unknown
  recipes: unknown
  grocery_list: unknown
  admin_notes: string | null
  client_notes: string | null
  status: string
  generated_by_ai: boolean
}

type ProgressLogRow = {
  id: string
  logged_at: string
  weight: string | null
  body_fat: string | null
  waist: string | null
  hips: string | null
  notes: string | null
}

type FormDataObject = Record<string, unknown>

function asObject(value: unknown): FormDataObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as FormDataObject
    : {}
}

function statusLabel(value: string | null | undefined) {
  return (value || 'unknown').replace(/_/g, ' ')
}

function fieldValue(section: FormDataObject, key: string) {
  const raw = section[key]
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  if (raw === null || raw === undefined || raw === '') return '—'
  if (key === 'strengthTraining') {
    const labels: Record<string, string> = {
      not_sure: 'Not sure',
      none: 'None right now',
      '1_2_days': '1-2 days per week',
      '3_4_days': '3-4 days per week',
      '5_plus_days': '5+ days per week',
    }
    return labels[String(raw)] ?? String(raw)
  }
  return String(raw)
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        className="uppercase"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'var(--admin-on-surface-variant)',
        }}
      >
        {label}
      </dt>
      <dd
        className="mt-1 whitespace-pre-wrap"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.9375rem',
          color: 'var(--admin-on-surface)',
          lineHeight: 1.6,
        }}
      >
        {value}
      </dd>
    </div>
  )
}

function SectionCard({
  title,
  section,
  fields,
}: {
  title: string
  section: FormDataObject
  fields: Array<{ key: string; label: string }>
}) {
  return (
    <section className="admin-card p-6">
      <h2
        className="mb-5"
        style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--admin-on-surface)',
        }}
      >
        {title}
      </h2>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {fields.map((field) => (
          <DetailField
            key={field.key}
            label={field.label}
            value={fieldValue(section, field.key)}
          />
        ))}
      </dl>
    </section>
  )
}

async function loadClient(clientId: string) {
  const supabase = await createAdminClient()

  const { data: client } = await supabase
    .from('coaching_clients')
    .select('id, email, first_name, last_name, status, onboarding_status, paid_at, coaching_order_id, created_at')
    .eq('id', clientId)
    .maybeSingle()

  if (!client) return null

  const [orderQuery, onboardingQuery, planQuery, progressQuery] = await Promise.all([
    client.coaching_order_id
      ? supabase
          .from('coaching_orders')
          .select('amount, stripe_session_id, status, created_at')
          .eq('id', client.coaching_order_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('coaching_onboarding')
      .select('form_data, submitted_at, updated_at')
      .eq('coaching_client_id', clientId)
      .maybeSingle(),
    supabase
      .from('coaching_plans')
      .select('planning_inputs, macro_targets, meal_plan, recipes, grocery_list, admin_notes, client_notes, status, generated_by_ai')
      .eq('coaching_client_id', clientId)
      .maybeSingle(),
    supabase
      .from('coaching_progress_logs')
      .select('id, logged_at, weight, body_fat, waist, hips, notes')
      .eq('coaching_client_id', clientId)
      .order('logged_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return {
    client: client as CoachingClient,
    order: orderQuery.data as CoachingOrder | null,
    onboarding: onboardingQuery.data as OnboardingRow | null,
    plan: planQuery.data as PlanRow | null,
    progressLogs: (progressQuery.data ?? []) as ProgressLogRow[],
  }
}

export default async function AdminCoachingClientPage({ params }: PageProps) {
  const { clientId } = await params
  const data = await loadClient(clientId)
  if (!data) notFound()

  const { client, order, onboarding, plan, progressLogs } = data
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || 'Coaching Client'
  const formData = asObject(onboarding?.form_data)
  const coachingPlan = plan
    ? parseCoachingPlan({
        macroTargets: plan.macro_targets,
        mealPlan: plan.meal_plan,
        recipes: plan.recipes,
        groceryList: plan.grocery_list,
        adminNotes: plan.admin_notes ?? '',
        clientNotes: plan.client_notes ?? '',
        status: plan.status,
        generatedByAi: plan.generated_by_ai,
      })
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/coaching"
            className="inline-flex items-center gap-2 mb-4"
            style={{
              fontFamily: 'var(--font-hanken)',
              color: 'var(--admin-on-surface-variant)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            Back to Coaching
          </Link>
          <h1
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--admin-on-surface)',
              lineHeight: 1.1,
            }}
          >
            {name}
          </h1>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
            {client.email}
          </p>
          <Link
            href={`/admin/messages?client=${client.id}`}
            className="inline-flex items-center gap-2 mt-2"
            style={{
              fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', fontWeight: 600,
              color: 'var(--botanical-green)', textDecoration: 'none',
            }}
          >
            Open messages →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="admin-pill admin-pill-success">{statusLabel(client.status)}</span>
          <span className={client.onboarding_status === 'submitted' ? 'admin-pill admin-pill-success' : 'admin-pill admin-pill-warning'}>
            {statusLabel(client.onboarding_status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="admin-card p-5">
          <DetailField label="Paid" value={client.paid_at ? formatShortDate(client.paid_at) : '—'} />
        </div>
        <div className="admin-card p-5">
          <DetailField label="Amount" value={formatCurrency(Number(order?.amount ?? 0), { precise: true })} />
        </div>
        <div className="admin-card p-5">
          <DetailField label="Stripe Session" value={order?.stripe_session_id ?? '—'} />
        </div>
      </div>

      {!onboarding ? (
        <div className="admin-card p-10 text-center">
          <CircleAlert className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--admin-on-surface-variant)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--admin-on-surface)',
            }}
          >
            Onboarding has not been submitted yet.
          </h2>
          <p className="mt-2" style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
            This page will fill in automatically after the client submits her onboarding form.
          </p>
        </div>
      ) : (
        <>
          <CoachingPlanEditor
            clientId={client.id}
            initialPlan={coachingPlan}
            onboardingData={formData}
            initialPlanningInputs={asObject(plan?.planning_inputs)}
            canGenerateAi={Boolean(process.env.OPENAI_API_KEY)}
          />

          <CoachingProgressTracker clientId={client.id} initialLogs={progressLogs} />

          <div className="admin-card p-5 flex items-center gap-3">
            <CheckCircle size={22} style={{ color: 'var(--admin-primary-container)' }} />
            <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface)', margin: 0 }}>
              Submitted {onboarding.submitted_at ? formatShortDate(onboarding.submitted_at) : 'recently'}
            </p>
          </div>

          <details className="admin-card">
            <summary
              style={{
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-eb-garamond)',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: 'var(--admin-on-surface)',
                  margin: 0,
                }}
              >
                Client Onboarding Responses
              </h2>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--admin-on-surface-variant)', flexShrink: 0 }}>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </summary>
            <div className="space-y-6" style={{ padding: '0 0 8px' }}>
              <SectionCard
                title="Personal Information"
                section={asObject(formData.personal)}
                fields={[
                  { key: 'firstName', label: 'First Name' },
                  { key: 'lastName', label: 'Last Name' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'timezone', label: 'Time Zone' },
                ]}
              />

              <SectionCard
                title="Goals & Body Data"
                section={{ ...asObject(formData.goals), ...asObject(formData.body) }}
                fields={[
                  { key: 'height', label: 'Height' },
                  { key: 'age', label: 'Age' },
                  { key: 'weight', label: 'Current Weight' },
                  { key: 'targetWeight', label: 'Goal Weight' },
                  { key: 'waist', label: 'Waist' },
                  { key: 'hips', label: 'Hips' },
                  { key: 'primaryGoal', label: 'Main Goal' },
                  { key: 'whyNow', label: 'Why Now' },
                  { key: 'success', label: '12-Week Success' },
                ]}
              />

              <SectionCard
                title="Health & Lifestyle"
                section={asObject(formData.health)}
                fields={[
                  { key: 'medicalConditions', label: 'Medical Conditions' },
                  { key: 'medications', label: 'Medications / Supplements' },
                  { key: 'injuries', label: 'Injuries / Limitations' },
                  { key: 'eatingDisorderHistory', label: 'Eating History' },
                  { key: 'sleep', label: 'Sleep' },
                  { key: 'stress', label: 'Stress' },
                ]}
              />

              <SectionCard
                title="Nutrition"
                section={asObject(formData.nutrition)}
                fields={[
                  { key: 'currentEating', label: 'Normal Day of Eating' },
                  { key: 'trackingExperience', label: 'Tracking Experience' },
                  { key: 'allergies', label: 'Allergies' },
                  { key: 'restrictions', label: 'Restrictions' },
                  { key: 'favoriteFoods', label: 'Favorite Foods' },
                  { key: 'dislikedFoods', label: 'Disliked Foods' },
                  { key: 'eatingOut', label: 'Eating Out' },
                  { key: 'water', label: 'Water' },
                  { key: 'caffeine', label: 'Caffeine' },
                ]}
              />

              <SectionCard
                title="Schedule & Accountability"
                section={asObject(formData.lifestyle)}
                fields={[
                  { key: 'workSchedule', label: 'Work / Family Schedule' },
                  { key: 'strengthTraining', label: 'Strength Training' },
                  { key: 'workouts', label: 'Current Workouts' },
                  { key: 'steps', label: 'Average Steps' },
                  { key: 'barriers', label: 'Biggest Barriers' },
                  { key: 'accountability', label: 'Preferred Accountability' },
                ]}
              />

              <SectionCard
                title="Agreements"
                section={asObject(formData.agreements)}
                fields={[
                  { key: 'notMedicalCare', label: 'Understands Coaching Is Not Medical Care' },
                  { key: 'notPregnantBreastfeeding', label: 'Not Pregnant Or Breastfeeding' },
                  { key: 'terms', label: 'Understands Plan Review Process' },
                ]}
              />
            </div>
          </details>
        </>
      )}
    </div>
  )
}
