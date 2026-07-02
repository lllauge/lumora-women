import { Resend } from 'resend'

function confirmationEmailHtml(firstName: string | null, actionLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 16px; font-size:32px;">Welcome to Lumora Women</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 20px;">
          Hi ${firstName || 'there'}, use this secure link to confirm your email and access your Lumora Women account.
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

export async function sendAuthActionEmail(input: {
  to: string
  firstName?: string | null
  actionLink: string
  subject?: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: input.to,
    subject: input.subject ?? 'Confirm your Lumora Women account',
    html: confirmationEmailHtml(input.firstName ?? null, input.actionLink),
    text: [
      `Hi ${input.firstName || 'there'},`,
      '',
      'Use this secure link to confirm your Lumora Women account:',
      input.actionLink,
    ].join('\n'),
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, error: null }
}

export async function sendSecurityNotice(input: {
  to: string
  subject: string
  message: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY is not configured.' }

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: 'Lumora Women Security <hello@lumorawomen.com>',
    to: input.to,
    subject: input.subject,
    html: `
      <div style="font-family:Arial,sans-serif;background:#F8F6F0;padding:32px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:36px;border:1px solid #E5E0D6">
          <h1 style="font-family:Georgia,serif;color:#1A2818;margin:0 0 16px;font-size:28px">Account security notice</h1>
          <p style="color:#3A4A38;font-size:16px;line-height:1.7">${input.message}</p>
          <p style="color:#6B6B64;font-size:13px;line-height:1.6;margin-top:24px">If you did not request this change, contact Lumora Women immediately.</p>
        </div>
      </div>
    `,
    text: `${input.message}\n\nIf you did not request this change, contact Lumora Women immediately.`,
  })
  return error ? { ok: false, error: error.message } : { ok: true, error: null }
}

export async function sendClientVerificationCode(input: {
  to: string
  code: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY is not configured.' }

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: 'Lumora Women Security <hello@lumorawomen.com>',
    to: input.to,
    subject: `${input.code} is your Lumora Women security code`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#F8F6F0;padding:32px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:36px;border:1px solid #E5E0D6">
          <h1 style="font-family:Georgia,serif;color:#1A2818;margin:0 0 16px;font-size:28px">Your security code</h1>
          <p style="color:#3A4A38;font-size:16px;line-height:1.7">Enter this code to finish signing in to Lumora Women:</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#3F6936;margin:24px 0">${input.code}</div>
          <p style="color:#6B6B64;font-size:13px;line-height:1.6">This code expires in 10 minutes. If you did not try to sign in, change your password immediately.</p>
        </div>
      </div>
    `,
    text: `Your Lumora Women security code is ${input.code}. It expires in 10 minutes. If you did not try to sign in, change your password immediately.`,
  })
  return error ? { ok: false, error: error.message } : { ok: true, error: null }
}

export function safeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}
