import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import SendTestPingButton from '@/components/admin/SendTestPingButton'

export const metadata: Metadata = {
  title: 'Today',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type ClientRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  onboarding_status: string
  paid_at: string | null
}

type OnboardingRow = { coaching_client_id: string; submitted_at: string | null }
type PlanRow = { coaching_client_id: string; status: string; updated_at: string }

type MessageRow = {
  id: string
  coaching_client_id: string
  body: string
  created_at: string
  coaching_clients: { first_name: string | null; last_name: string | null; email: string } | null
}

type DailyLog = { coaching_client_id: string; log_date: string }

function fullName(c: { first_name: string | null; last_name: string | null; email: string }) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return name || c.email
}

function daysSince(iso: string | null) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number, yellowAt: number, redAt: number) {
  if (days >= redAt) return { fg: '#8B2C2C', bg: 'rgba(139, 44, 44, 0.08)' }
  if (days >= yellowAt) return { fg: '#9B6B0A', bg: 'rgba(200, 152, 10, 0.12)' }
  return { fg: 'var(--admin-on-surface-variant)', bg: 'transparent' }
}

async function loadData() {
  const supabase = await createAdminClient()

  const [
    { data: clients },
    { data: onboardings },
    { data: plans },
    { data: messages },
    { data: recentLogs },
  ] = await Promise.all([
    supabase
      .from('coaching_clients')
      .select('id, email, first_name, last_name, status, onboarding_status, paid_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('coaching_onboarding')
      .select('coaching_client_id, submitted_at'),
    supabase
      .from('coaching_plans')
      .select('coaching_client_id, status, updated_at'),
    supabase
      .from('coaching_messages')
      .select(`
        id, coaching_client_id, body, created_at,
        coaching_clients(first_name, last_name, email)
      `)
      .eq('sender', 'client')
      .is('read_by_coach_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('coaching_daily_logs')
      .select('coaching_client_id, log_date')
      .gte('log_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ])

  return {
    clients: (clients ?? []) as ClientRow[],
    onboardings: (onboardings ?? []) as OnboardingRow[],
    plans: (plans ?? []) as PlanRow[],
    messages: (messages ?? []) as unknown as MessageRow[],
    recentLogs: (recentLogs ?? []) as DailyLog[],
  }
}

export default async function AdminTodayPage() {
  const { clients, onboardings, plans, messages, recentLogs } = await loadData()

  const onboardingByClient = new Map<string, OnboardingRow>()
  for (const o of onboardings) onboardingByClient.set(o.coaching_client_id, o)

  const planByClient = new Map<string, PlanRow>()
  for (const p of plans) planByClient.set(p.coaching_client_id, p)

  const lastLogByClient = new Map<string, string>()
  for (const log of recentLogs) {
    const existing = lastLogByClient.get(log.coaching_client_id)
    if (!existing || existing < log.log_date) {
      lastLogByClient.set(log.coaching_client_id, log.log_date)
    }
  }

  const planOverdue = clients
    .map((c) => {
      const submittedAt = onboardingByClient.get(c.id)?.submitted_at ?? null
      const plan = planByClient.get(c.id)
      const published = plan?.status === 'published'
      if (!submittedAt || published) return null
      const days = daysSince(submittedAt) ?? 0
      return { client: c, days, planStatus: plan?.status ?? 'not_started' }
    })
    .filter((row): row is { client: ClientRow; days: number; planStatus: string } => row !== null)
    .sort((a, b) => b.days - a.days)

  const paidNotOnboarded = clients
    .map((c) => {
      if (c.onboarding_status !== 'not_started') return null
      if (!c.paid_at) return null
      const days = daysSince(c.paid_at) ?? 0
      return { client: c, days }
    })
    .filter((row): row is { client: ClientRow; days: number } => row !== null)
    .sort((a, b) => b.days - a.days)

  const quietClients = clients
    .map((c) => {
      if (c.status !== 'plan_pending' && c.status !== 'active') return null
      const submittedAt = onboardingByClient.get(c.id)?.submitted_at
      if (!submittedAt) return null
      const lastLog = lastLogByClient.get(c.id) ?? null
      const lastActivityIso = lastLog ? `${lastLog}T00:00:00Z` : submittedAt
      const days = daysSince(lastActivityIso) ?? 0
      if (days < 5) return null
      return { client: c, days, lastLog }
    })
    .filter((row): row is { client: ClientRow; days: number; lastLog: string | null } => row !== null)
    .sort((a, b) => b.days - a.days)

  const todaysWork =
    messages.length + planOverdue.length + paidNotOnboarded.length + quietClients.length

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '2rem', fontWeight: 600, color: 'var(--admin-on-surface)' }}>
            Today
          </h1>
          <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
            {todaysWork === 0
              ? 'Inbox zero. Nothing waiting on you right now.'
              : `${todaysWork} ${todaysWork === 1 ? 'item' : 'items'} waiting on you.`}
          </p>
        </div>
        <SendTestPingButton />
      </div>

      <Section
        title="Unread messages from clients"
        emptyText="No unread messages."
        count={messages.length}
      >
        {messages.map((m) => (
          <Row
            key={m.id}
            primary={m.coaching_clients ? fullName(m.coaching_clients) : 'Client'}
            secondary={m.body.slice(0, 140)}
            meta={`${daysSince(m.created_at) ?? 0}d ago`}
            metaColor={urgencyColor(daysSince(m.created_at) ?? 0, 1, 3)}
            href={`/admin/messages?client=${encodeURIComponent(m.coaching_client_id)}`}
          />
        ))}
      </Section>

      <Section
        title="Plans waiting to be built"
        emptyText="All plans up to date."
        count={planOverdue.length}
      >
        {planOverdue.map(({ client, days, planStatus }) => (
          <Row
            key={client.id}
            primary={fullName(client)}
            secondary={planStatus === 'not_started' ? 'No plan started yet' : `Plan in ${planStatus.replace(/_/g, ' ')}`}
            meta={`onboarded ${days}d ago`}
            metaColor={urgencyColor(days, 2, 5)}
            href={`/admin/coaching/${client.id}`}
          />
        ))}
      </Section>

      <Section
        title="Paid, waiting to onboard"
        emptyText="Everyone paid has started onboarding."
        count={paidNotOnboarded.length}
      >
        {paidNotOnboarded.map(({ client, days }) => (
          <Row
            key={client.id}
            primary={fullName(client)}
            secondary={client.email}
            meta={`paid ${days}d ago`}
            metaColor={urgencyColor(days, 3, 7)}
            href={`/admin/coaching/${client.id}`}
          />
        ))}
      </Section>

      <Section
        title="Quiet clients (5+ days)"
        emptyText="Everyone is engaged this week."
        count={quietClients.length}
      >
        {quietClients.map(({ client, days, lastLog }) => (
          <Row
            key={client.id}
            primary={fullName(client)}
            secondary={lastLog ? `Last log ${lastLog}` : 'No logs yet'}
            meta={`${days}d quiet`}
            metaColor={urgencyColor(days, 5, 10)}
            href={`/admin/coaching/${client.id}`}
          />
        ))}
      </Section>
    </div>
  )
}

function Section({
  title,
  count,
  emptyText,
  children,
}: {
  title: string
  count: number
  emptyText: string
  children: React.ReactNode
}) {
  return (
    <div className="admin-card overflow-hidden" style={{ borderRadius: '0.75rem' }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-outline-variant)' }}>
        <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--admin-on-surface)' }}>
          {title}
        </h2>
        <span style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', color: 'var(--admin-on-surface-variant)' }}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="px-6 py-5" style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: 'var(--admin-on-surface-variant)' }}>
          {emptyText}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {children}
        </ul>
      )}
    </div>
  )
}

function Row({
  primary,
  secondary,
  meta,
  metaColor,
  href,
}: {
  primary: string
  secondary: string
  meta: string
  metaColor: { fg: string; bg: string }
  href: string
}) {
  return (
    <li style={{ borderBottom: '1px solid var(--admin-outline-variant)' }}>
      <Link
        href={href}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '1rem',
          alignItems: 'center',
          padding: '0.875rem 1.5rem',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-hanken)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--admin-on-surface)' }}>
            {primary}
          </div>
          <div style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.8125rem', color: 'var(--admin-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {secondary}
          </div>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: metaColor.fg,
            background: metaColor.bg,
            padding: '0.25rem 0.625rem',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
          }}
        >
          {meta}
        </span>
      </Link>
    </li>
  )
}
