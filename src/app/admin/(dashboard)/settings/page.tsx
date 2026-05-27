import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isR2Configured } from '@/lib/r2'
import { isSettingsTableAvailable, DEFAULT_SETTINGS } from '@/lib/settings-schema'
import ProfileForm from '@/components/admin/settings/ProfileForm'
import IntegrationStatus, { type IntegrationCheck } from '@/components/admin/settings/IntegrationStatus'
import EmailSettingsForm from '@/components/admin/settings/EmailSettingsForm'
import SiteSettingsForm from '@/components/admin/settings/SiteSettingsForm'
import DangerZone from '@/components/admin/settings/DangerZone'

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
}

async function loadProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle()

  return {
    first_name: profile?.first_name ?? '',
    last_name:  profile?.last_name  ?? '',
    email:      profile?.email ?? user.email ?? '',
  }
}

async function loadSettings(): Promise<{ enabled: boolean; values: typeof DEFAULT_SETTINGS }> {
  const enabled = await isSettingsTableAvailable()
  if (!enabled) return { enabled: false, values: DEFAULT_SETTINGS }

  const supabase = await createClient()
  const { data } = await supabase
    .from('settings')
    .select('setting_key, setting_value')
    .in('setting_key', Object.keys(DEFAULT_SETTINGS))

  const map = new Map<string, unknown>(
    ((data ?? []) as { setting_key: string; setting_value: unknown }[])
      .map((r) => [r.setting_key, r.setting_value])
  )

  return {
    enabled: true,
    values: {
      support_email:         (map.get('support_email')         as string)  ?? DEFAULT_SETTINGS.support_email as string,
      notify_new_enrollment: typeof map.get('notify_new_enrollment') === 'boolean'
        ? (map.get('notify_new_enrollment') as boolean)
        : (DEFAULT_SETTINGS.notify_new_enrollment as boolean),
      notify_daily_revenue:  typeof map.get('notify_daily_revenue') === 'boolean'
        ? (map.get('notify_daily_revenue') as boolean)
        : (DEFAULT_SETTINGS.notify_daily_revenue as boolean),
      show_shop: typeof map.get('show_shop') === 'boolean'
        ? (map.get('show_shop') as boolean)
        : (DEFAULT_SETTINGS.show_shop as boolean),
    },
  }
}

function buildIntegrationChecks(): IntegrationCheck[] {
  const supabaseConnected =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY

  const stripeConnected =
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  return [
    {
      key: 'stripe',
      name: 'Stripe',
      description: 'Payment processing & billing infrastructure',
      connected: stripeConnected,
      note: stripeConnected ? undefined : 'Set STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    },
    {
      key: 'supabase',
      name: 'Supabase',
      description: 'Postgres, Auth, and Row-Level Security',
      connected: supabaseConnected,
      note: supabaseConnected ? undefined : 'Set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY + SERVICE_ROLE_KEY',
    },
    {
      key: 'r2',
      name: 'Cloudflare R2',
      description: 'S3-compatible object storage for media assets',
      connected: isR2Configured(),
      note: isR2Configured() ? undefined : 'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL',
    },
  ]
}

export default async function AdminSettingsPage() {
  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const [profile, settings] = supabaseConfigured
    ? await Promise.all([loadProfile(), loadSettings()])
    : [{ first_name: '', last_name: '', email: '' }, { enabled: false, values: DEFAULT_SETTINGS }]

  const checks = buildIntegrationChecks()

  return (
    <div className="space-y-6">

      {/* Page intro */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '2rem',
          fontWeight: 500,
          color: 'var(--admin-on-surface)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Platform Configuration
        </h2>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.9375rem',
          color: 'var(--admin-on-surface-variant)',
          marginTop: '0.375rem',
          maxWidth: '46rem',
        }}>
          Manage your administrative preferences, connected financial infrastructure, and system-wide communication protocols.
        </p>
      </div>

      <ProfileForm initial={profile} />

      <IntegrationStatus checks={checks} />

      <SiteSettingsForm
        initial={{ show_shop: settings.values.show_shop as boolean }}
        enabled={settings.enabled}
      />

      <EmailSettingsForm
        initial={{
          support_email:         settings.values.support_email as string,
          notify_new_enrollment: settings.values.notify_new_enrollment as boolean,
          notify_daily_revenue:  settings.values.notify_daily_revenue as boolean,
        }}
        enabled={settings.enabled}
      />

      <DangerZone />
    </div>
  )
}
