import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'
import { verifyHcaptcha } from '@/lib/hcaptcha'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitizeField } from '@/lib/sanitize'

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

function confirmationEmailHtml(firstName: string, actionLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 16px; font-size:32px;">Welcome to Lumora Women</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 20px;">
          Hi ${firstName || 'there'}, confirm your email address to activate your account and access your courses.
        </p>
        <a href="${actionLink}" style="display:inline-block; background:#4A7A40; color:#FFFFFF; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:700;">
          Confirm My Email
        </a>
        <p style="color:#6B6B64; font-size:13px; line-height:1.6; margin:28px 0 0;">
          If the button does not work, copy and paste this link into your browser:<br />
          <span style="word-break:break-all;">${actionLink}</span>
        </p>
      </div>
    </div>
  `
}

export async function POST(req: NextRequest) {
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

  const captchaOk = await verifyHcaptcha(parsed.data.captchaToken)
  if (!captchaOk) {
    return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 })
  }

  const firstName = sanitizeField(parsed.data.firstName, 80)
  const lastName = sanitizeField(parsed.data.lastName, 80)
  const email = parsed.data.email.trim().toLowerCase()
  const siteUrl = getSiteUrl(req)
  const supabase = getAdminClient()

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password: parsed.data.password,
    options: {
      redirectTo: `${siteUrl}/dashboard`,
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

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('[signup] RESEND_API_KEY is missing')
    return NextResponse.json(
      { error: 'Email is not configured. Please contact support.' },
      { status: 500 }
    )
  }

  try {
    const resend = new Resend(resendKey)
    const { error: emailError } = await resend.emails.send({
      from: 'Lumora Women <hello@lumorawomen.com>',
      to: email,
      subject: 'Confirm your Lumora Women account',
      html: confirmationEmailHtml(firstName, data.properties.action_link),
      text: [
        `Hi ${firstName || 'there'},`,
        '',
        'Confirm your Lumora Women account using this link:',
        data.properties.action_link,
      ].join('\n'),
    })

    if (emailError) {
      console.error('[signup] Resend failed:', emailError)
      return NextResponse.json(
        { error: 'Your account was created, but the confirmation email could not be sent. Please contact support.' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('[signup] Resend exception:', err)
    return NextResponse.json(
      { error: 'Your account was created, but the confirmation email could not be sent. Please contact support.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
