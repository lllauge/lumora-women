import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitizeField } from '@/lib/sanitize'
import { verifyHcaptcha } from '@/lib/hcaptcha'
import { requireSameOrigin } from '@/lib/request-security'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'hello@lumorawomen.com'

const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(254),
  subject: z.enum([
    'course-support',
    'account',
    'community',
    'refund',
    'partnerships',
    'other',
  ], { message: 'Invalid subject' }),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  hcaptchaToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  // ── Rate limiting: 3 submissions per hour per IP ──────────────────────────
  const ip = getClientIp(req.headers)
  const rateLimit = await checkRateLimit(`contact:${ip}`, 3, 3600)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many messages submitted. Please wait an hour before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  // ── Parse and validate body ───────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = ContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  // ── hCaptcha verification ─────────────────────────────────────────────────
  const captchaOk = await verifyHcaptcha(parsed.data.hcaptchaToken)
  if (!captchaOk) {
    return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 })
  }

  // ── Sanitize all text fields ──────────────────────────────────────────────
  const name    = sanitizeField(parsed.data.name, 100)
  const email   = sanitizeField(parsed.data.email, 254)
  const subject = parsed.data.subject
  const message = sanitizeField(parsed.data.message, 5000)

  // ── Send email via Resend ─────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const subjectLabel: Record<string, string> = {
        'course-support': 'Course Support',
        'account': 'Account / Login Help',
        'community': 'Community Question',
        'refund': 'Refund Request',
        'partnerships': 'Partnerships & Collaborations',
        'other': 'Other',
      }

      await resend.emails.send({
        from: 'Lumora Women Contact <noreply@lumorawomen.com>',
        to: ADMIN_EMAIL,
        replyTo: email,
        subject: `[Contact Form] ${subjectLabel[subject] ?? subject} — ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Topic: ${subjectLabel[subject] ?? subject}`,
          '',
          message,
        ].join('\n'),
      })
    } catch (emailErr) {
      console.error('[contact] Resend error:', emailErr)
      // Don't expose email errors to the client; still return success
    }
  }

  return NextResponse.json({ success: true })
}
