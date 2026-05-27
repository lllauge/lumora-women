'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AdminAuthResult = { error?: string }

/**
 * Signs the admin in via Supabase, verifies the row in public.users
 * has role='admin', then redirects to /admin. Non-admin accounts are
 * signed back out and an error is returned.
 */
export async function signInAdmin(formData: FormData): Promise<AdminAuthResult> {
  const email = (formData.get('email') ?? '').toString().trim()
  const password = (formData.get('password') ?? '').toString()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password })

  if (signInError || !signInData.user) {
    return { error: 'Invalid email or password.' }
  }

  // Verify admin role
  const { data: profile, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', signInData.user.id)
    .maybeSingle()

  if (roleError || profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'This account does not have admin access.' }
  }

  redirect('/admin')
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
