'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyTotp } from '@/lib/totp'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit-log'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type TotpResult = { error?: string }

/** Save a verified TOTP secret to the admin's user row. */
export async function saveTotpSecret(formData: FormData): Promise<TotpResult> {
  const token  = (formData.get('token')  ?? '').toString().trim()
  const secret = (formData.get('secret') ?? '').toString().trim()
  const userId = (formData.get('userId') ?? '').toString().trim()

  if (!token || !secret || !userId) {
    return { error: 'Missing required fields.' }
  }

  // Verify current user session + admin role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return { error: 'Unauthorized.' }
  }

  const adminClient = getAdminClient()
  const { data: profile } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return { error: 'Unauthorized.' }
  }

  // Verify the token against the generated secret before saving
  const isValid = verifyTotp(token, secret)
  if (!isValid) {
    return { error: 'Invalid authentication code. Please rescan the QR code and try again.' }
  }

  const { error: updateError } = await adminClient
    .from('users')
    .update({ totp_secret: secret })
    .eq('id', userId)

  if (updateError) {
    return { error: 'Failed to save TOTP secret. Please try again.' }
  }

  await logAdminAction({
    adminUserId: userId,
    action: 'update',
    tableName: 'users',
    recordId: userId,
    newValues: { totp_enabled: true },
  })

  return {}
}

/** Remove TOTP from admin account (disables 2FA). */
export async function disableTotp(): Promise<TotpResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }

  const adminClient = getAdminClient()
  const { data: profile } = await adminClient
    .from('users').select('role').eq('id', user.id).maybeSingle()

  if (profile?.role !== 'admin') return { error: 'Unauthorized.' }

  const { error } = await adminClient
    .from('users')
    .update({ totp_secret: null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  await logAdminAction({ adminUserId: user.id, action: 'update', tableName: 'users', newValues: { totp_enabled: false } })
  return {}
}
