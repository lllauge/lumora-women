import { createClient } from '@/lib/supabase/server'

let cached: { value: boolean; expires: number } | null = null
const CACHE_MS = 60 * 1000 // 60s — long enough to skip per-request reflection,
                            // short enough that running v3.sql shows up quickly.

/**
 * Returns true if the v3 schema migration has been applied and the
 * `published_at` / `scheduled_at` columns exist on `blog_posts`. Falls back
 * to `false` if the migration hasn't been run so the editor degrades cleanly.
 */
export async function isSchedulingAvailable(): Promise<boolean> {
  if (cached && cached.expires > Date.now()) return cached.value

  const supabase = await createClient()
  // Cheapest reflection: try to project the columns with limit 0
  const { error } = await supabase
    .from('blog_posts')
    .select('published_at, scheduled_at', { count: 'exact', head: true })
    .limit(0)

  const ok = !error
  cached = { value: ok, expires: Date.now() + CACHE_MS }
  return ok
}
