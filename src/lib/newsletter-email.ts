import { Resend } from 'resend'
import { buildUnsubscribeUrl } from '@/lib/unsubscribe-token'

function welcomeHtml(firstName: string | null, unsubscribeUrl: string) {
  const greeting = firstName ? `Welcome, ${firstName}.` : 'Welcome.'
  return `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 16px; font-size:30px;">${greeting}</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 16px;">
          We are honored to have you in this space.
        </p>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 16px;">
          A gentle letter will land in your inbox each Sunday with practical wisdom on postpartum recovery, hormone health, and every season of womanhood, plus the first word on new courses and member only offers.
        </p>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0;">
          With warmth,<br />
          Lumora
        </p>
      </div>
      <p style="max-width:560px; margin:24px auto 0; text-align:center; font-size:12px; line-height:1.6; color:#8B8B82;">
        You are receiving this because you joined the Lumora Women newsletter.<br />
        <a href="${unsubscribeUrl}" style="color:#8B8B82; text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `
}

export async function sendNewsletterWelcome(input: {
  to: string
  firstName?: string | null
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const resend = new Resend(resendKey)
  const greeting = input.firstName ? `Welcome, ${input.firstName}.` : 'Welcome.'
  const unsubscribeUrl = buildUnsubscribeUrl(input.to)

  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: input.to,
    subject: 'Welcome to Lumora',
    html: welcomeHtml(input.firstName ?? null, unsubscribeUrl),
    text: [
      greeting,
      '',
      'We are honored to have you in this space.',
      '',
      'A gentle letter will land in your inbox each Sunday with practical wisdom on postpartum recovery, hormone health, and every season of womanhood, plus the first word on new courses and member only offers.',
      '',
      'With warmth,',
      'Lumora',
      '',
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join('\n'),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:hello@lumorawomen.com?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, error: null }
}
