import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendAdminSms } from '@/lib/admin-sms'

export const dynamic = 'force-dynamic'

type ClientRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  onboarding_status: string
  paid_at: string | null
  coaching_onboarding: { submitted_at: string | null }[] | null
  coaching_plans: { status: string }[] | null
}

function daysSince(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

async function summarize() {
  const supabase = await createAdminClient()

  const [{ data: clients }, { count: unreadMessages }, { data: recentLogs }] = await Promise.all([
    supabase
      .from('coaching_clients')
      .select(`
        id, email, first_name, last_name, status, onboarding_status, paid_at,
        coaching_onboarding(submitted_at),
        coaching_plans(status)
      `),
    supabase
      .from('coaching_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender', 'client')
      .is('read_by_coach_at', null),
    supabase
      .from('coaching_daily_logs')
      .select('coaching_client_id, log_date')
      .gte('log_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ])

  const lastLogByClient = new Map<string, string>()
  for (const log of (recentLogs ?? []) as { coaching_client_id: string; log_date: string }[]) {
    const existing = lastLogByClient.get(log.coaching_client_id)
    if (!existing || existing < log.log_date) {
      lastLogByClient.set(log.coaching_client_id, log.log_date)
    }
  }

  let plansOverdue = 0
  let plansUrgent = 0
  let paidNotOnboarded = 0
  let quietClients = 0

  for (const c of (clients ?? []) as unknown as ClientRow[]) {
    const submittedAt = c.coaching_onboarding?.[0]?.submitted_at ?? null
    const plan = c.coaching_plans?.[0]
    const published = plan?.status === 'published'

    if (submittedAt && !published) {
      const days = daysSince(submittedAt) ?? 0
      if (days >= 2) plansOverdue += 1
      if (days >= 5) plansUrgent += 1
    }

    if (c.onboarding_status === 'not_started' && c.paid_at) {
      const days = daysSince(c.paid_at) ?? 0
      if (days >= 3) paidNotOnboarded += 1
    }

    if ((c.status === 'plan_pending' || c.status === 'active') && submittedAt) {
      const lastLog = lastLogByClient.get(c.id)
      const lastActivityIso = lastLog ? `${lastLog}T00:00:00Z` : submittedAt
      const days = daysSince(lastActivityIso) ?? 0
      if (days >= 7) quietClients += 1
    }
  }

  return {
    unreadMessages: unreadMessages ?? 0,
    plansOverdue,
    plansUrgent,
    paidNotOnboarded,
    quietClients,
  }
}

function composeMessage(s: Awaited<ReturnType<typeof summarize>>) {
  const parts: string[] = []
  if (s.plansOverdue > 0) {
    parts.push(`${s.plansOverdue} plan${s.plansOverdue === 1 ? '' : 's'} to build${s.plansUrgent > 0 ? ` (${s.plansUrgent} urgent)` : ''}`)
  }
  if (s.paidNotOnboarded > 0) {
    parts.push(`${s.paidNotOnboarded} paid but not onboarded`)
  }
  if (s.unreadMessages > 0) {
    parts.push(`${s.unreadMessages} unread client message${s.unreadMessages === 1 ? '' : 's'}`)
  }
  if (s.quietClients > 0) {
    parts.push(`${s.quietClients} client${s.quietClients === 1 ? '' : 's'} quiet 7+ days`)
  }
  return parts.length === 0
    ? null
    : `Lumora today: ${parts.join(', ')}.`
}

async function run() {
  const summary = await summarize()
  const message = composeMessage(summary)
  if (!message) {
    return { ok: true, summary, sent: false, reason: 'nothing actionable' }
  }
  const sms = await sendAdminSms(message, { title: 'Lumora · Today' })
  return { ok: sms.ok, summary, sent: sms.ok, reason: sms.ok ? null : sms.reason }
}

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return { ok: false as const, status: 503, msg: 'CRON_SECRET not configured.' }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) return { ok: false as const, status: 401, msg: 'Unauthorized.' }
  return { ok: true as const }
}

export async function POST(req: Request) {
  const a = authorized(req)
  if (!a.ok) return NextResponse.json({ ok: false, error: a.msg }, { status: a.status })
  const result = await run()
  return NextResponse.json(result)
}

export async function GET(req: Request) {
  const a = authorized(req)
  if (!a.ok) return NextResponse.json({ ok: false, error: a.msg }, { status: a.status })
  const result = await run()
  return NextResponse.json(result)
}
