'use server'

import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const SubscribeSchema = z.object({
  email:      z.string().email('Please enter a valid email address.').max(254),
  first_name: z.string().max(100).optional(),
  source:     z.string().max(50).optional(),
})

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function subscribeToNewsletter(formData: FormData) {
  // ── Rate limiting: 5 subscriptions per hour per IP ─────────────────────────
  const headerStore = await headers()
  const forwarded = headerStore.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : (headerStore.get('x-real-ip') ?? 'unknown')

  const rateLimit = await checkRateLimit(`subscribe:${ip}`, 5, 3600)
  if (!rateLimit.allowed) {
    return { error: 'Too many signup attempts. Please try again later.' }
  }

  // ── Validate input ─────────────────────────────────────────────────────────
  const rawEmail     = (formData.get('email') as string)?.trim().toLowerCase()
  const rawFirstName = (formData.get('first_name') as string)?.trim()
  const rawSource    = (formData.get('source') as string)?.trim()

  const parsed = SubscribeSchema.safeParse({
    email: rawEmail,
    first_name: rawFirstName,
    source: rawSource,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, first_name, source } = parsed.data

  // ── Insert via service role (RLS blocks anon client inserts) ──────────────
  const supabase = getServiceClient()
  const subscriber = { email, first_name: first_name ?? null }

  const { error } = await supabase
    .from('email_subscribers')
    .upsert(
      { ...subscriber, source: source ?? 'website' },
      { onConflict: 'email', ignoreDuplicates: false }
    )

  if (error) {
    if (/source/i.test(error.message)) {
      const { error: retryError } = await supabase
        .from('email_subscribers')
        .upsert(
          subscriber,
          { onConflict: 'email', ignoreDuplicates: false }
        )

      if (!retryError) {
        return { success: true }
      }
    }

    return { error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}
