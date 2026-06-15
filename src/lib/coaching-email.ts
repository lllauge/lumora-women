import { Resend } from 'resend'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function checkoutEmailHtml(input: { firstName?: string; checkoutUrl: string; amount: number }) {
  const greeting = input.firstName?.trim()
    ? `Hi ${escapeHtml(input.firstName.trim())},`
    : 'Hi,'
  const amount = input.amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  return `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 16px;">${greeting}</p>
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 14px; font-size:32px;">Your 1:1 coaching checkout is ready</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 18px;">
          Your private Lumora Women coaching checkout link is ready. Once payment is complete, you&apos;ll be directed to create or log into your account and complete your onboarding form.
        </p>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 22px;">
          Investment: <strong>${amount}</strong>
        </p>
        <a href="${input.checkoutUrl}" style="display:inline-block; background:#3A4B36; color:#FFFFFF; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:700;">
          Complete Checkout
        </a>
        <p style="color:#6B6B64; font-size:13px; line-height:1.6; margin:28px 0 0;">
          If the button does not work, copy and paste this link into your browser:<br />
          <span style="word-break:break-all;">${input.checkoutUrl}</span>
        </p>
      </div>
    </div>
  `
}

export async function sendClientMessageNotification(input: {
  clientName: string
  clientId: string
  intro: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://lumorawomen.com'
  const inboxUrl = `${siteUrl}/admin/messages?client=${encodeURIComponent(input.clientId)}`
  const resend = new Resend(resendKey)
  const name = escapeHtml(input.clientName)
  const intro = escapeHtml(input.intro)

  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: 'hello@lumorawomen.com',
    subject: `Coaching: ${input.clientName} — new message`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
        <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
          <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 14px; font-size:24px;">${name} is waiting on you</h1>
          <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 22px;">${intro}</p>
          <a href="${inboxUrl}" style="display:inline-block; background:#3A4B36; color:#FFFFFF; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:700;">
            Open Messages
          </a>
        </div>
      </div>
    `,
    text: [`${input.intro}`, '', `Open messages: ${inboxUrl}`].join('\n'),
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

export async function sendCoachingCompInviteEmail(input: {
  to: string
  firstName?: string
  signupUrl: string
  loginUrl: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const resend = new Resend(resendKey)
  const firstName = input.firstName?.trim()
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,'

  const html = `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 16px;">${greeting}</p>
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 14px; font-size:32px;">Welcome to Lumora Women coaching</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 22px;">
          Your 1:1 coaching access is ready. Create your account (or log in if you already have one) using this same email, then complete your onboarding so I can build your plan.
        </p>
        <a href="${input.signupUrl}" style="display:inline-block; background:#3A4B36; color:#FFFFFF; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:700;">
          Create Account &amp; Start Onboarding
        </a>
        <p style="color:#6B6B64; font-size:14px; line-height:1.6; margin:22px 0 0;">
          Already have an account? <a href="${input.loginUrl}" style="color:#3A4B36;">Log in here</a>.
        </p>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: input.to,
    subject: 'Your Lumora Women coaching access is ready',
    html,
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'Your 1:1 Lumora Women coaching access is ready.',
      'Create your account (or log in) with this same email and complete your onboarding form.',
      '',
      `Create account: ${input.signupUrl}`,
      `Log in: ${input.loginUrl}`,
    ].join('\n'),
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

export async function sendCoachingCheckoutEmail(input: {
  to: string
  firstName?: string
  checkoutUrl: string
  amount: number
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const resend = new Resend(resendKey)
  const firstName = input.firstName?.trim()
  const amount = input.amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: input.to,
    subject: 'Your Lumora Women coaching checkout link',
    html: checkoutEmailHtml({
      firstName,
      checkoutUrl: input.checkoutUrl,
      amount: input.amount,
    }),
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'Your private Lumora Women coaching checkout link is ready.',
      `Investment: ${amount}`,
      '',
      'After payment, create or log into your account with this same email and complete your onboarding form.',
      '',
      `Complete checkout: ${input.checkoutUrl}`,
    ].join('\n'),
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, error: null }
}
