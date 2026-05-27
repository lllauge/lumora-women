'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/lib/audit-log'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized.')
  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') throw new Error('Unauthorized.')
  return user
}

export async function deleteSubscriber(formData: FormData) {
  const user = await assertAdmin()
  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { ok: false, error: 'Missing subscriber id.' }

  const supabase = await createClient()

  // Fetch old values for audit log
  const { data: old } = await supabase
    .from('email_subscribers').select('email').eq('id', id).maybeSingle()

  const { error } = await supabase.from('email_subscribers').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  await logAdminAction({
    adminUserId: user.id,
    action: 'delete',
    tableName: 'email_subscribers',
    recordId: id,
    oldValues: old ?? undefined,
  })

  revalidatePath('/admin/email-list')
  revalidatePath('/admin')
  return { ok: true }
}

export type CsvExportResult =
  | { ok: true;  csv: string; filename: string; count: number }
  | { ok: false; error: string }

/**
 * Export subscribers as CSV. Requires the admin to re-authenticate
 * with their current password before the export is returned.
 */
export async function exportEmailListCSV({
  q = '',
  password,
}: {
  q?: string
  password: string
}): Promise<CsvExportResult> {
  // ── Step 1: Assert admin session ──────────────────────────────────────────
  let user: { id: string; email?: string | undefined }
  try {
    user = await assertAdmin()
  } catch {
    return { ok: false, error: 'Unauthorized.' }
  }

  // ── Step 2: Re-authenticate with current password ─────────────────────────
  if (!password || password.length < 1) {
    return { ok: false, error: 'Password is required to export data.' }
  }

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser?.email) return { ok: false, error: 'Session error.' }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password,
  })

  if (authError) {
    return { ok: false, error: 'Incorrect password. Export cancelled.' }
  }

  // ── Step 3: Fetch data via service role ───────────────────────────────────
  const adminClient = getAdminClient()

  type Row = {
    id: string
    email: string
    first_name: string | null
    subscribed_at: string
    source?: string | null
  }

  const search = q.trim().replace(/[%,]/g, '')

  let query = adminClient
    .from('email_subscribers')
    .select('id, email, first_name, subscribed_at, source')
    .order('subscribed_at', { ascending: false })

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`)
  }

  let { data, error } = await query

  if (error && /source/i.test(error.message)) {
    let q2 = adminClient
      .from('email_subscribers')
      .select('id, email, first_name, subscribed_at')
      .order('subscribed_at', { ascending: false })
    if (search) q2 = q2.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`)
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

  // ── Step 4: Audit log ─────────────────────────────────────────────────────
  await logAdminAction({
    adminUserId: user.id,
    action: 'csv_export',
    tableName: 'email_subscribers',
    newValues: { rows_exported: rows.length, search_filter: search || null },
  })

  return { ok: true, csv, filename, count: rows.length }
}

function csvEscape(value: string | null | undefined): string {
  const s = (value ?? '').toString()
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function pad(n: number) { return n.toString().padStart(2, '0') }
