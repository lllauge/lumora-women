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
}

type OnboardingRow = { coaching_client_id: string; submitted_at: string | null }
type PlanRow = { coaching_client_id: string; status: string }

function daysSince(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

type NameEntry = { name: string; days: number }

function fullName(c: { first_name: string | null; last_name: string | null; email: string }) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return name || c.email
}

async function summarize() {
  const supabase = await createAdminClient()

  const [
    { data: clients },
    { data: onboardings },
    { data: plans },
    { data: unread },
    { data: recentLogs },
  ] = await Promise.all([
    supabase
      .from('coaching_clients')
      .select('id, email, first_name, last_name, status, onboarding_status, paid_at'),
    supabase
      .from('coaching_onboarding')
      .select('coaching_client_id, submitted_at'),
    supabase
      .from('coaching_plans')
      .select('coaching_client_id, status'),
    supabase
      .from('coaching_messages')
      .select('coaching_client_id, coaching_clients(first_name, last_name, email)')
      .eq('sender', 'client')
      .is('read_by_coach_at', null),
    supabase
      .from('coaching_daily_logs')
      .select('coaching_client_id, log_date')
      .gte('log_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ])

  const onboardingByClient = new Map<string, OnboardingRow>()
  for (const o of (onboardings ?? []) as OnboardingRow[]) onboardingByClient.set(o.coaching_client_id, o)

  const planByClient = new Map<string, PlanRow>()
  for (const p of (plans ?? []) as PlanRow[]) planByClient.set(p.coaching_client_id, p)

  const lastLogByClient = new Map<string, string>()
  for (const log of (recentLogs ?? []) as { coaching_client_id: string; log_date: string }[]) {
    const existing = lastLogByClient.get(log.coaching_client_id)
    if (!existing || existing < log.log_date) {
      lastLogByClient.set(log.coaching_client_id, log.log_date)
    }
  }

  const plansList: NameEntry[] = []
  const paidList: NameEntry[] = []
  const quietList: NameEntry[] = []

  for (const c of (clients ?? []) as ClientRow[]) {
    const submittedAt = onboardingByClient.get(c.id)?.submitted_at ?? null
    const plan = planByClient.get(c.id)
    const published = plan?.status === 'published'

    if (submittedAt && !published) {
      plansList.push({ name: fullName(c), days: daysSince(submittedAt) ?? 0 })
    }

    if (c.onboarding_status === 'not_started' && c.paid_at) {
      paidList.push({ name: fullName(c), days: daysSince(c.paid_at) ?? 0 })
    }

    if ((c.status === 'plan_pending' || c.status === 'active') && submittedAt) {
      const lastLog = lastLogByClient.get(c.id)
      const lastActivityIso = lastLog ? `${lastLog}T00:00:00Z` : submittedAt
      const days = daysSince(lastActivityIso) ?? 0
      if (days >= 7) {
        quietList.push({ name: fullName(c), days })
      }
    }
  }

  const sentBy = (a: NameEntry, b: NameEntry) => b.days - a.days
  plansList.sort(sentBy)
  paidList.sort(sentBy)
  quietList.sort(sentBy)

  type EmbeddedClient = { first_name: string | null; last_name: string | null; email: string }
  const unreadNames = new Set<string>()
  for (const m of (unread ?? []) as unknown as { coaching_client_id: string; coaching_clients: EmbeddedClient | EmbeddedClient[] | null }[]) {
    const c = Array.isArray(m.coaching_clients) ? m.coaching_clients[0] : m.coaching_clients
    if (c) unreadNames.add(fullName(c))
  }

  return {
    plans: plansList,
    paid: paidList,
    quiet: quietList,
    unread: Array.from(unreadNames),
  }
}

function formatList(entries: NameEntry[], max = 4) {
  const shown = entries.slice(0, max).map((e) => `${e.name} (${e.days}d)`).join(', ')
  const extra = entries.length - max
  return extra > 0 ? `${shown}, +${extra} more` : shown
}

function composeMessage(s: Awaited<ReturnType<typeof summarize>>) {
  const lines: string[] = []
  if (s.plans.length > 0) {
    lines.push(`Plans to build: ${formatList(s.plans)}`)
  }
  if (s.paid.length > 0) {
    lines.push(`Paid, not onboarded: ${formatList(s.paid)}`)
  }
  if (s.unread.length > 0) {
    const names = s.unread.slice(0, 4).join(', ')
    const extra = s.unread.length - 4
    lines.push(`Unread from: ${names}${extra > 0 ? `, +${extra} more` : ''}`)
  }
  if (s.quiet.length > 0) {
    lines.push(`Quiet 7+ days: ${formatList(s.quiet)}`)
  }
  if (lines.length === 0) return null
  return `Lumora today\n\n${lines.join('\n')}`
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
