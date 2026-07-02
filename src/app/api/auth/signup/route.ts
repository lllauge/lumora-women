import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { safeRedirectPath, sendAuthActionEmail } from '@/lib/auth-email'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitizeField } from '@/lib/sanitize'
import { requireSameOrigin } from '@/lib/request-security'

const SignupSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional().default(''),
  email: z.string().email().max(254),
  password: z.string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Password must include one uppercase letter.')
    .regex(/[0-9]/, 'Password must include one number.'),
  captchaToken: z.string().optional().nullable(),
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
  const fromHeader =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host')

  const requestOrigin = fromHeader
    ? `${req.headers.get('x-forwarded-proto') || 'https'}://${fromHeader}`
    : req.nextUrl.origin

  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''

  const siteUrl = configured.includes('localhost') || configured.includes('127.0.0.1')
    ? requestOrigin
    : configured || requestOrigin

  return siteUrl.replace(/\/$/, '')
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  const ip = getClientIp(req.headers)
  const limit = await checkRateLimit(`signup:${ip}`, 8, 60 * 60)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please wait a bit and try again.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = SignupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the signup form and try again.' },
      { status: 400 }
    )
  }

  const captcha = await verifyRecaptcha({
    token: parsed.data.captchaToken,
    action: 'signup',
    request: req,
    minimumScore: 0.6,
  })
  if (!captcha.ok) {
    return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 400 })
  }

  const firstName = sanitizeField(parsed.data.firstName, 80)
  const lastName = sanitizeField(parsed.data.lastName, 80)
  const email = parsed.data.email.trim().toLowerCase()
  const siteUrl = getSiteUrl(req)
  const redirectPath = safeRedirectPath(parsed.data.redirectTo)
  const supabase = getAdminClient()

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password: parsed.data.password,
    options: {
      redirectTo: `${siteUrl}${redirectPath}`,
      data: {
        first_name: firstName,
        last_name: lastName,
        role: 'student',
      },
    },
  })

  if (error || !data.properties?.action_link || !data.user?.id) {
    console.error('[signup] generateLink failed:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Your account could not be created. Please contact support.' },
      { status: 400 }
    )
  }

  const { error: profileError } = await supabase.from('users').upsert({
    id: data.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    role: 'student',
  })

  if (profileError) {
    console.error('[signup] profile upsert failed:', profileError.message)
    return NextResponse.json(
      { error: 'Your account was created, but your profile could not be saved. Please contact support.' },
      { status: 500 }
    )
  }

  const subscriber = { email, first_name: firstName || null }
  const { error: subscriberError } = await supabase
    .from('email_subscribers')
    .upsert(
      { ...subscriber, source: 'signup' },
      { onConflict: 'email', ignoreDuplicates: false }
    )

  if (subscriberError && /source/i.test(subscriberError.message)) {
    await supabase
      .from('email_subscribers')
      .upsert(subscriber, { onConflict: 'email', ignoreDuplicates: false })
  } else if (subscriberError) {
    console.error('[signup] subscriber upsert failed:', subscriberError.message)
  }

  const emailResult = await sendAuthActionEmail({
    to: email,
    firstName,
    actionLink: data.properties.action_link,
  })

  if (!emailResult.ok) {
    console.error('[signup] confirmation email failed:', emailResult.error)
    return NextResponse.json(
      { error: 'Your account was created, but the confirmation email could not be sent. Please contact support.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
