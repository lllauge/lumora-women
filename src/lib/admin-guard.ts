import { createClient } from '@/lib/supabase/server'

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

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assuranceError || assurance.currentLevel !== 'aal2') {
    throw new Error('Admin verification required.')
  }

  return { user, supabase }
}
