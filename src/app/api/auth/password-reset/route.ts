import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'

const RequestSchema = z.object({
  email: z.string().trim().email().max(320),
})

async function accountHash(email: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(email.toLowerCase()),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: true })
  }

  const ip = getClientIp(request.headers)
  const key = await accountHash(parsed.data.email)
  const [ipLimit, accountLimit] = await Promise.all([
    checkRateLimit(`password_reset_ip:${ip}`, 5, 60 * 60),
    checkRateLimit(`password_reset_account:${key}`, 3, 60 * 60),
  ])
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many reset requests. Please wait before trying again.' },
      { status: 429 },
    )
  }

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || request.nextUrl.origin
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin.replace(/\/$/, '')}/reset-password`,
  })
  if (error) console.error('[password-reset] request failed:', error.message)

  // Keep the response identical whether or not the account exists.
  return NextResponse.json({ ok: true })
}
