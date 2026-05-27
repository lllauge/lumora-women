'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function subscribeToNewsletter(formData: FormData) {
  const email      = (formData.get('email') as string)?.trim().toLowerCase()
  const first_name = (formData.get('first_name') as string)?.trim()

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('email_subscribers')
    .upsert({ email, first_name }, { onConflict: 'email', ignoreDuplicates: false })

  if (error) {
    return { error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}
