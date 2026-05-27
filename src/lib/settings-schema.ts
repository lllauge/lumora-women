import { createClient } from '@/lib/supabase/server'

let cached: { value: boolean; expires: number } | null = null
const CACHE_MS = 60_000

/** Returns true if the v3 `settings` table exists. */
export async function isSettingsTableAvailable(): Promise<boolean> {
  if (cached && cached.expires > Date.now()) return cached.value
  const supabase = await createClient()
  const { error } = await supabase
    .from('settings')
    .select('id', { count: 'exact', head: true })
    .limit(0)
  const ok = !error
  cached = { value: ok, expires: Date.now() + CACHE_MS }
  return ok
}

export type SettingKey =
  | 'support_email'
  | 'notify_new_enrollment'
  | 'notify_daily_revenue'
  | 'show_shop'

export const DEFAULT_SETTINGS: Record<SettingKey, string | boolean> = {
  support_email:         'hello@lumorawomen.com',
  notify_new_enrollment: true,
  notify_daily_revenue:  false,
  show_shop:             false,
}

/** Returns whether the shop should be visible in the public nav/footer. */
export async function getShowShop(): Promise<boolean> {
  try {
    const available = await isSettingsTableAvailable()
    if (!available) return DEFAULT_SETTINGS.show_shop as boolean

    const supabase = await createClient()
    const { data } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'show_shop')
      .maybeSingle()

    if (data == null) return DEFAULT_SETTINGS.show_shop as boolean
    return (data as { setting_value: boolean }).setting_value === true
  } catch {
    return DEFAULT_SETTINGS.show_shop as boolean
  }
}
