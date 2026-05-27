'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Admin guard (used by callable actions) ──────────────────────────────────

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized.')
  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') throw new Error('Unauthorized.')
}

// ─── Delete subscriber ───────────────────────────────────────────────────────

export async function deleteSubscriber(formData: FormData) {
  await assertAdmin()
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { ok: false, error: 'Missing subscriber id.' }
  const supabase = await createClient()
  const { error } = await supabase.from('email_subscribers').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/email-list')
  revalidatePath('/admin')
  return { ok: true }
}

// ─── Export CSV ──────────────────────────────────────────────────────────────

export type CsvExportResult =
  | { ok: true;  csv: string; filename: string; count: number }
  | { ok: false; error: string }

/**
 * Returns the full subscriber list as a CSV string. The client wraps it in a
 * Blob to trigger the download — no extra HTTP round-trip needed.
 *
 * Optional `q` filter respects whatever was on screen so the admin can export
 * a search result. Empty `q` → everyone.
 */
export async function exportEmailListCSV({ q = '' }: { q?: string } = {}): Promise<CsvExportResult> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // Try with `source` column; fall back to v2 schema if it doesn't exist yet.
  type Row = {
    id: string
    email: string
    first_name: string | null
    subscribed_at: string
    source?: string | null
  }

  const search = q.trim().replace(/[%,]/g, '')

  let query = supabase
    .from('email_subscribers')
    .select('id, email, first_name, subscribed_at, source')
    .order('subscribed_at', { ascending: false })

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`)
  }

  let { data, error } = await query

  if (error && /source/i.test(error.message)) {
    // v3 schema not applied yet — fall back without `source`
    let q2 = supabase
      .from('email_subscribers')
      .select('id, email, first_name, subscribed_at')
      .order('subscribed_at', { ascending: false })
    if (search) {
      q2 = q2.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`)
    }
    const fallback = await q2
    data  = fallback.data as typeof data
    error = fallback.error
  }

  if (error) return { ok: false, error: error.message }

  const rows = (data ?? []) as Row[]

  const header = ['First Name', 'Email', 'Subscribed At', 'Source']
  const csvLines = [header.map(csvEscape).join(',')]
  for (const r of rows) {
    csvLines.push([
      r.first_name ?? '',
      r.email,
      r.subscribed_at,
      r.source ?? 'website',
    ].map(csvEscape).join(','))
  }
  const csv = csvLines.join('\r\n') + '\r\n'

  const now = new Date()
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const filename = `lumora-subscribers-${datePart}.csv`

  return { ok: true, csv, filename, count: rows.length }
}

function csvEscape(value: string | null | undefined): string {
  const s = (value ?? '').toString()
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function pad(n: number) { return n.toString().padStart(2, '0') }
