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
    subject: `Coaching: ${input.clientName}, new message`,
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
  lang?: 'en' | 'es'
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const resend = new Resend(resendKey)
  const firstName = input.firstName?.trim()
  const es = input.lang === 'es'

  const copy = es
    ? {
        greeting: firstName ? `Hola ${escapeHtml(firstName)},` : 'Hola,',
        subject: 'Tu acceso al coaching de Lumora Women está listo',
        heading: 'Bienvenida al coaching de Lumora Women',
        body: 'Tu acceso al coaching 1:1 está listo. Crea tu cuenta (o inicia sesión si ya tienes una) con este mismo correo y completa tu formulario inicial para que pueda crear tu plan.',
        button: 'Crear cuenta y comenzar',
        loginPrompt: '¿Ya tienes una cuenta?',
        loginLink: 'Inicia sesión aquí',
        textGreeting: firstName ? `Hola ${firstName},` : 'Hola,',
        textBody: [
          'Tu acceso al coaching 1:1 de Lumora Women está listo.',
          'Crea tu cuenta (o inicia sesión) con este mismo correo y completa tu formulario inicial.',
        ],
        textSignup: 'Crear cuenta',
        textLogin: 'Iniciar sesión',
      }
    : {
        greeting: firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,',
        subject: 'Your Lumora Women coaching access is ready',
        heading: 'Welcome to Lumora Women coaching',
        body: 'Your 1:1 coaching access is ready. Create your account (or log in if you already have one) using this same email, then complete your onboarding so I can build your plan.',
        button: 'Create Account &amp; Start Onboarding',
        loginPrompt: 'Already have an account?',
        loginLink: 'Log in here',
        textGreeting: `Hi ${firstName || 'there'},`,
        textBody: [
          'Your 1:1 Lumora Women coaching access is ready.',
          'Create your account (or log in) with this same email and complete your onboarding form.',
        ],
        textSignup: 'Create account',
        textLogin: 'Log in',
      }

  const html = `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 16px;">${copy.greeting}</p>
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 14px; font-size:32px;">${copy.heading}</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 22px;">
          ${copy.body}
        </p>
        <a href="${input.signupUrl}" style="display:inline-block; background:#3A4B36; color:#FFFFFF; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:700;">
          ${copy.button}
        </a>
        <p style="color:#6B6B64; font-size:14px; line-height:1.6; margin:22px 0 0;">
          ${copy.loginPrompt} <a href="${input.loginUrl}" style="color:#3A4B36;">${copy.loginLink}</a>.
        </p>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: input.to,
    subject: copy.subject,
    html,
    text: [
      copy.textGreeting,
      '',
      ...copy.textBody,
      '',
      `${copy.textSignup}: ${input.signupUrl}`,
      `${copy.textLogin}: ${input.loginUrl}`,
    ].join('\n'),
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

export async function sendPlanPublishedEmail(input: {
  to: string
  firstName?: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://lumorawomen.com'
  const planUrl = `${siteUrl}/coaching/plan`
  const resend = new Resend(resendKey)
  const firstName = input.firstName?.trim()
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,'

  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: input.to,
    subject: 'Your personalized plan is ready',
    html: `
      <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
        <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
          <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 16px;">${greeting}</p>
          <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 14px; font-size:32px;">Your personalized plan is ready</h1>
          <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 22px;">
            I just published your plan. Your meals, portions, grocery list, and weekly targets are all set and waiting in your portal — everything is built around what you told me, so all you have to do is follow it.
          </p>
          <a href="${planUrl}" style="display:inline-block; background:#3A4B36; color:#FFFFFF; text-decoration:none; padding:14px 22px; border-radius:999px; font-weight:700;">
            See My Plan
          </a>
          <p style="color:#6B6B64; font-size:13px; line-height:1.6; margin:28px 0 0;">
            If the button does not work, copy and paste this link into your browser:<br />
            <span style="word-break:break-all;">${planUrl}</span>
          </p>
        </div>
      </div>
    `,
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'I just published your plan. Your meals, portions, grocery list, and weekly targets are all set and waiting in your portal.',
      '',
      `See your plan: ${planUrl}`,
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
