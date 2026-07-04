import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'export'
  | 'login' | 'logout' | 'totp_verified' | 'totp_failed'
  | 'csv_export' | 'password_reauth'

export async function logAdminAction({
  adminUserId,
  action,
  tableName,
  recordId,
  oldValues,
  newValues,
}: {
  adminUserId: string
  action: AuditAction
  tableName?: string
  recordId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}) {
  try {
    const headerStore = await headers()
    const forwarded = headerStore.get('x-forwarded-for')
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : (headerStore.get('x-real-ip') ?? 'unknown')

    const supabase = getServiceClient()
    // Supabase returns failures instead of throwing — a discarded error here
    // hid a missing audit_logs table for weeks. Log it so schema drift shows
    // up in server logs instead of silently dropping the audit trail.
    const { error } = await supabase.from('audit_logs').insert({
      admin_user_id: adminUserId,
      action,
      table_name: tableName ?? null,
      record_id: recordId ?? null,
      old_values: oldValues ?? null,
      new_values: newValues ?? null,
      ip_address: ip,
    })
    if (error) {
      console.error('[audit-log] Failed to write audit entry:', error.message)
    }
  } catch (err) {
    // Never let audit logging failures break the main flow
    console.error('[audit-log] Failed to write audit entry:', err)
  }
}
