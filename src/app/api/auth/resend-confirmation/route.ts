import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { safeRedirectPath, sendAuthActionEmail } from '@/lib/auth-email'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/request-security'

const ResendConfirmationSchema = z.object({
  email: z.string().email().max(254),
  redirectTo: z.string().optional().nullable(),
})

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getSiteUrl(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/+$/, '')
  }

  return req.nextUrl.origin
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  const ip = getClientIp(req.headers)
  const limit = await checkRateLimit(`resend-confirmation:${ip}`, 5, 60 * 60)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many resend attempts. Please wait a bit and try again.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = ResendConfirmationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const redirectPath = safeRedirectPath(parsed.data.redirectTo)
  const supabase = getAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('email, first_name')
    .eq('email', email)
    .maybeSingle()

  if (profileError) {
    console.error('[resend-confirmation] profile lookup failed:', profileError.message)
    return NextResponse.json({ error: 'Could not send a new link. Please try again.' }, { status: 500 })
  }

  // Do not reveal whether an account exists for this email.
  if (!profile?.email) {
    return NextResponse.json({ success: true })
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${getSiteUrl(req)}${redirectPath}`,
    },
  })

  if (error || !data.properties?.action_link) {
    console.error('[resend-confirmation] generateLink failed:', error?.message)
    return NextResponse.json({ error: 'Could not send a new link. Please try again.' }, { status: 500 })
  }

  const emailResult = await sendAuthActionEmail({
    to: email,
    firstName: profile.first_name,
    actionLink: data.properties.action_link,
    subject: 'Your Lumora Women login link',
  })

  if (!emailResult.ok) {
    console.error('[resend-confirmation] email failed:', emailResult.error)
    return NextResponse.json({ error: 'Could not send a new link. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
