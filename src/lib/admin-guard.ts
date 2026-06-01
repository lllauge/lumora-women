import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { adminSessionCookies, verifySignedAdminCookie } from '@/lib/admin-session'

export async function getVerifiedAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized.')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') throw new Error('Unauthorized.')

  const cookieStore = await cookies()
  const mfaCookie = cookieStore.get(adminSessionCookies.mfa)?.value
  const mfaVerified = await verifySignedAdminCookie(mfaCookie, 'mfa', user.id)
  if (!mfaVerified) throw new Error('Admin verification required.')

  return { user, supabase }
}
