import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number }

/**
 * Sliding-window rate limiter backed by Supabase.
 * key    — unique identifier, e.g. "contact:192.168.1.1"
 * max    — maximum requests allowed in the window
 * windowSeconds — window length in seconds
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const supabase = getServiceClient()
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

    const { count, error } = await supabase
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart)

    if (error) {
      // If the table doesn't exist yet, allow the request (fail open)
      console.error('[rate-limit] DB error, failing open:', error.message)
      return { allowed: true, remaining: max - 1 }
    }

    const current = count ?? 0

    if (current >= max) {
      return { allowed: false, retryAfterSeconds: windowSeconds }
    }

    await supabase.from('rate_limits').insert({ key })

    return { allowed: true, remaining: max - current - 1 }
  } catch (err) {
    console.error('[rate-limit] Unexpected error, failing open:', err)
    return { allowed: true, remaining: max - 1 }
  }
}

/** Pull the best available client IP from request headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? 'unknown'
}
