'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getR2Config, isR2Configured, uploadFileToR2 } from '@/lib/r2'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

// ─── Admin guard ──────────────────────────────────────────────────────────────

async function getAdminUser() {
  const { user } = await getVerifiedAdminUser()
  return user
}

// ─── Profile update ───────────────────────────────────────────────────────────

const profileSchema = z.object({
  first_name: z.string().min(1).max(120),
  last_name:  z.string().max(120).default(''),
  email:      z.string().email().max(255),
})

export async function updateAdminProfile(formData: FormData) {
  let user
  try { user = await getAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }

  const parsed = profileSchema.safeParse({
    first_name: (formData.get('first_name') ?? '').toString().trim(),
    last_name:  (formData.get('last_name')  ?? '').toString().trim(),
    email:      (formData.get('email')      ?? '').toString().trim(),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid name and email.' }
  }

  const supabase = await createClient()

  // Update public.users row
  const { error: profileError } = await supabase
    .from('users')
    .update({
      first_name: parsed.data.first_name,
      last_name:  parsed.data.last_name || null,
      email:      parsed.data.email,
    })
    .eq('id', user.id)
  if (profileError) return { ok: false, error: `Could not update profile: ${profileError.message}` }

  // If the email changed, also update auth.users via Supabase Auth
  if (parsed.data.email !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({ email: parsed.data.email })
    if (authError) {
      return { ok: false, error: `Profile saved, but Supabase Auth email update failed: ${authError.message}. You may need to confirm via email.` }
    }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { ok: true }
}

// ─── Password change ──────────────────────────────────────────────────────────

export async function changeAdminPassword(formData: FormData) {
  try { await getAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }

  const password = (formData.get('password') ?? '').toString()
  if (password.length < 12) {
    return { ok: false, error: 'Password must be at least 12 characters.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── Settings (settings key/value table) ─────────────────────────────────────

const settingsPayloadSchema = z.object({
  support_email:         z.string().email().max(255),
  notify_new_enrollment: z.boolean(),
  notify_daily_revenue:  z.boolean(),
  show_shop:             z.boolean(),
})

export type SettingsPayload = z.infer<typeof settingsPayloadSchema>

export async function saveAdminSettings(payload: unknown) {
  try { await getAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }

  const parsed = settingsPayloadSchema.partial().safeParse(payload)
  if (!parsed.success) {
    return { ok: false, error: 'Please check your inputs and try again.' }
  }

  const supabase = await createClient()

  type SettingRow = {
    setting_key: string
    setting_value: unknown
    updated_at: string
  }
  const now = new Date().toISOString()

  const upserts: SettingRow[] = []
  if (parsed.data.support_email         !== undefined) upserts.push({ setting_key: 'support_email',         setting_value: parsed.data.support_email,         updated_at: now })
  if (parsed.data.notify_new_enrollment !== undefined) upserts.push({ setting_key: 'notify_new_enrollment', setting_value: parsed.data.notify_new_enrollment, updated_at: now })
  if (parsed.data.notify_daily_revenue  !== undefined) upserts.push({ setting_key: 'notify_daily_revenue',  setting_value: parsed.data.notify_daily_revenue,  updated_at: now })
  if (parsed.data.show_shop             !== undefined) upserts.push({ setting_key: 'show_shop',             setting_value: parsed.data.show_shop,             updated_at: now })

  for (const row of upserts) {
    const { error } = await supabase
      .from('settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(row as any, { onConflict: 'setting_key' })
    if (error) {
      if (/relation .* does not exist/i.test(error.message)) {
        return { ok: false, error: 'Settings table not found. Run supabase-schema-v3.sql first.' }
      }
      return { ok: false, error: error.message }
    }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/')
  revalidatePath('/courses')
  return { ok: true }
}

// ─── R2 test upload ───────────────────────────────────────────────────────────

export type R2TestResult =
  | { ok: true;  message: string; url: string }
  | { ok: false; error: string; configured: boolean }

export async function runR2UploadTest(): Promise<R2TestResult> {
  try { await getAdminUser() } catch { return { ok: false, error: 'Unauthorized.', configured: isR2Configured() } }

  const config = getR2Config()
  if (!config) {
    return {
      ok: false,
      error: 'Cloudflare R2 isn’t configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL in .env.local.',
      configured: false,
    }
  }

  // Generate a tiny test PNG (1x1) and upload it under a timestamped key
  const blob = new Blob([new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x6E, 0x49, 0x6F,
    0x68, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82,
  ])], { type: 'image/png' })
  const file = new File([blob], 'r2-test.png', { type: 'image/png' })
  const key = `admin/health-checks/${Date.now()}.png`

  const result = await uploadFileToR2(file, key)
  if (!result.ok) {
    return { ok: false, error: result.error, configured: true }
  }
  return {
    ok: true,
    message: 'Upload succeeded — R2 credentials are working.',
    url: result.url,
  }
}

// ─── Danger zone: clear test data ─────────────────────────────────────────────

export type ClearTestDataResult =
  | { ok: true;  removed: { enrollments: number; orders: number; subscribers: number } }
  | { ok: false; error: string }

/**
 * Deletes test rows across enrollments, orders, and email_subscribers per the
 * brief: "where the associated user email contains the word test".
 *
 * Uses the service-role client so it can bypass RLS for the multi-table cascade.
 */
export async function clearTestData(): Promise<ClearTestDataResult> {
  try { await getAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }

  const supabase = await createAdminClient()

  // 1. Find user ids whose email matches *test*
  const { data: testUsers, error: usersErr } = await supabase
    .from('users')
    .select('id')
    .ilike('email', '%test%')
  if (usersErr) return { ok: false, error: `Could not find test users: ${usersErr.message}` }

  const userIds = (testUsers ?? []).map((u) => u.id as string)

  let enrollmentsRemoved = 0
  let ordersRemoved = 0

  if (userIds.length > 0) {
    const { count: enrollCount, error: enrollErr } = await supabase
      .from('enrollments')
      .delete({ count: 'exact' })
      .in('user_id', userIds)
    if (enrollErr) return { ok: false, error: `Could not delete enrollments: ${enrollErr.message}` }
    enrollmentsRemoved = enrollCount ?? 0

    const { count: orderCount, error: ordersErr } = await supabase
      .from('orders')
      .delete({ count: 'exact' })
      .in('user_id', userIds)
    if (ordersErr) return { ok: false, error: `Could not delete orders: ${ordersErr.message}` }
    ordersRemoved = orderCount ?? 0
  }

  // 2. Subscribers (no FK to users — match directly on email)
  const { count: subsCount, error: subsErr } = await supabase
    .from('email_subscribers')
    .delete({ count: 'exact' })
    .ilike('email', '%test%')
  if (subsErr) return { ok: false, error: `Could not delete subscribers: ${subsErr.message}` }
  const subscribersRemoved = subsCount ?? 0

  revalidatePath('/admin')
  revalidatePath('/admin/students')
  revalidatePath('/admin/orders')
  revalidatePath('/admin/email-list')

  return {
    ok: true,
    removed: {
      enrollments: enrollmentsRemoved,
      orders:      ordersRemoved,
      subscribers: subscribersRemoved,
    },
  }
}
