'use server'

import { createClient } from '@/lib/supabase/server'
import { rangeBounds } from '@/lib/orders-range'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { verifyAdminStepUp } from '@/app/actions/admin-auth'

// ─── Order detail (drawer) ────────────────────────────────────────────────────

export type OrderDetail = {
  id: string
  amount: number
  status: string
  stripe_payment_id: string | null
  created_at: string
  student: {
    id: string | null
    email: string | null
    first_name: string | null
    last_name: string | null
    joined_at: string | null
  } | null
  course: {
    id: string | null
    title: string | null
    is_free: boolean | null
    thumbnail_url: string | null
  } | null
}

type OrderDetailResult =
  | { ok: true;  detail: OrderDetail }
  | { ok: false; error: string }

export async function getOrderDetail(orderId: string): Promise<OrderDetailResult> {
  try { await getVerifiedAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }

  if (!orderId) return { ok: false, error: 'Missing order id.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, amount, status, stripe_payment_id, created_at,
      users(id, email, first_name, last_name, created_at),
      courses(id, title, is_free, thumbnail_url)
    `)
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Order not found.' }
  }

  type RawOrder = {
    id: string
    amount: number | string
    status: string
    stripe_payment_id: string | null
    created_at: string
    users: { id: string; email: string; first_name: string | null; last_name: string | null; created_at: string } | null
    courses: { id: string; title: string; is_free: boolean; thumbnail_url: string | null } | null
  }
  const o = data as unknown as RawOrder

  return {
    ok: true,
    detail: {
      id: o.id,
      amount: Number(o.amount ?? 0),
      status: o.status,
      stripe_payment_id: o.stripe_payment_id,
      created_at: o.created_at,
      student: o.users
        ? {
            id: o.users.id,
            email: o.users.email,
            first_name: o.users.first_name,
            last_name:  o.users.last_name,
            joined_at:  o.users.created_at,
          }
        : null,
      course: o.courses
        ? {
            id: o.courses.id,
            title: o.courses.title,
            is_free: o.courses.is_free,
            thumbnail_url: o.courses.thumbnail_url,
          }
        : null,
    },
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export type OrdersExportResult =
  | { ok: true;  csv: string; filename: string; count: number }
  | { ok: false; error: string }

export async function exportOrdersCSV(
  args: { q?: string; range?: string; authCode?: string } = {}
): Promise<OrdersExportResult> {
  try { await getVerifiedAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }
  const stepUp = await verifyAdminStepUp(args.authCode ?? '')
  if (!stepUp.ok) return { ok: false, error: stepUp.error ?? 'Verification failed.' }

  const supabase = await createClient()
  const { from } = rangeBounds(args.range ?? '30d')
  const search   = (args.q ?? '').trim().replace(/[%,]/g, '')

  let query = supabase
    .from('orders')
    .select(`
      id, amount, status, stripe_payment_id, created_at,
      users(email, first_name, last_name),
      courses(title)
    `)
    .order('created_at', { ascending: false })

  if (from)   query = query.gte('created_at', from)
  if (search) query = query.or(`stripe_payment_id.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }

  type Row = {
    id: string
    amount: number | string
    status: string
    stripe_payment_id: string | null
    created_at: string
    users: { email: string; first_name: string | null; last_name: string | null } | null
    courses: { title: string } | null
  }
  const rows = (data ?? []) as unknown as Row[]

  const header = ['Order ID', 'Date', 'Student Email', 'Student Name', 'Course', 'Amount', 'Status', 'Stripe Payment ID']
  const csvLines = [header.map(csvEscape).join(',')]
  for (const r of rows) {
    csvLines.push([
      r.id,
      r.created_at,
      r.users?.email ?? '',
      [r.users?.first_name, r.users?.last_name].filter(Boolean).join(' '),
      r.courses?.title ?? '',
      Number(r.amount).toFixed(2),
      r.status,
      r.stripe_payment_id ?? '',
    ].map(csvEscape).join(','))
  }
  const csv = csvLines.join('\r\n') + '\r\n'

  const now = new Date()
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const filename = `lumora-orders-${datePart}.csv`

  return { ok: true, csv, filename, count: rows.length }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvEscape(value: string | null | undefined): string {
  const s = (value ?? '').toString()
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function pad(n: number) { return n.toString().padStart(2, '0') }
