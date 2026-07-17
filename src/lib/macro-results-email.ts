import { Resend } from 'resend'
import { buildUnsubscribeUrl } from '@/lib/unsubscribe-token'
import type { PublicMacroResult } from '@/lib/macro-calculator-public'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lumorawomen.com'

function resultsHtml(firstName: string | null, result: PublicMacroResult, unsubscribeUrl: string) {
  const greeting = firstName ? `${firstName}, your numbers are ready.` : 'Your numbers are ready.'

  const insightBlocks = result.insights
    .map(
      (insight) => `
        <div style="background:#EAF2E4; border-radius:12px; padding:16px 20px; margin:0 0 12px;">
          <p style="color:#1A2818; font-size:15px; font-weight:bold; margin:0 0 6px;">${insight.title}</p>
          <p style="color:#3A4A38; font-size:14px; line-height:1.7; margin:0;">${insight.body}</p>
        </div>`
    )
    .join('')

  return `
    <div style="font-family: Arial, sans-serif; background:#F8F6F0; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:36px; border:1px solid #E5E0D6;">
        <h1 style="font-family: Georgia, serif; color:#1A2818; margin:0 0 16px; font-size:28px;">${greeting}</h1>
        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0 0 24px;">
          Here are your daily targets for ${result.goalApplied}, calculated from your real life, not a one size formula.
        </p>

        <div style="text-align:center; background:#F8F6F0; border-radius:12px; padding:24px; margin:0 0 16px;">
          <p style="font-family: Georgia, serif; color:#1A2818; font-size:40px; margin:0;">${result.calories}</p>
          <p style="color:#44713B; font-size:12px; letter-spacing:2px; margin:4px 0 0;">CALORIES PER DAY</p>
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr>
            <td align="center" style="background:#F8F6F0; border-radius:12px; padding:16px; width:33%;">
              <p style="font-family: Georgia, serif; color:#1A2818; font-size:22px; margin:0;">${result.proteinG}g</p>
              <p style="color:#44713B; font-size:11px; letter-spacing:1px; margin:4px 0 0;">PROTEIN</p>
            </td>
            <td style="width:8px;"></td>
            <td align="center" style="background:#F8F6F0; border-radius:12px; padding:16px; width:33%;">
              <p style="font-family: Georgia, serif; color:#1A2818; font-size:22px; margin:0;">${result.carbsG}g</p>
              <p style="color:#44713B; font-size:11px; letter-spacing:1px; margin:4px 0 0;">CARBS</p>
            </td>
            <td style="width:8px;"></td>
            <td align="center" style="background:#F8F6F0; border-radius:12px; padding:16px; width:33%;">
              <p style="font-family: Georgia, serif; color:#1A2818; font-size:22px; margin:0;">${result.fatG}g</p>
              <p style="color:#44713B; font-size:11px; letter-spacing:1px; margin:4px 0 0;">FAT</p>
            </td>
          </tr>
        </table>

        <p style="color:#3A4A38; font-size:14px; line-height:1.7; margin:0 0 24px;">
          Also aim for about <strong>${result.fiberG}g of fiber</strong> and <strong>${result.water}</strong> of water.
          Your estimated maintenance is about <strong>${result.maintenanceCalories} calories</strong>.
        </p>

        ${insightBlocks}

        <h2 style="font-family: Georgia, serif; color:#1A2818; font-size:20px; margin:24px 0 8px;">How we got these numbers</h2>
        <p style="color:#3A4A38; font-size:14px; line-height:1.7; margin:0 0 24px;">
          We estimated your metabolism from your age, height, and weight, then layered on how you actually move through a normal day. Your protein is anchored to the body you are building, your fat stays high enough to support your hormones, and your carbs fill the exact remainder, so the three macros always add up to your calories. No mystery multipliers, and nothing hidden. This is the same math we use with our one on one coaching clients.
        </p>

        <p style="color:#3A4A38; font-size:14px; line-height:1.7; margin:0 0 24px;">
          One honest note: every formula, including ours, is a starting point. Eat at these numbers consistently for 2 to 3 weeks, watch what your body does, and adjust from real data. That skill, running your own numbers with confidence, is exactly what we are building a full course to teach. Keep an eye on your inbox, you will be the first to know.
        </p>

        <div style="text-align:center; margin:0 0 8px;">
          <a href="${SITE_URL}/free-course" style="display:inline-block; background:#162814; color:#FFFFFF; text-decoration:none; border-radius:9999px; padding:12px 28px; font-size:14px;">Start the free course</a>
        </div>
        <p style="text-align:center; color:#5A6B58; font-size:13px; margin:0 0 24px;">
          Want these numbers turned into a full plan built for you? <a href="${SITE_URL}/work-with-me" style="color:#44713B;">Learn about coaching</a>.
        </p>

        <p style="color:#3A4A38; font-size:16px; line-height:1.7; margin:0;">
          With warmth,<br />
          Lumora
        </p>
      </div>
      <p style="max-width:560px; margin:24px auto 0; text-align:center; font-size:12px; line-height:1.6; color:#8B8B82;">
        These numbers are a general guide produced by a calculation, not medical or nutritional advice. Always check with your healthcare provider before changing how you eat or train, especially if you are breastfeeding or managing a health condition.<br /><br />
        You are receiving this because you used the Lumora Women macro calculator.<br />
        <a href="${unsubscribeUrl}" style="color:#8B8B82; text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `
}

export async function sendMacroResults(input: {
  to: string
  firstName?: string | null
  result: PublicMacroResult
}) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }

  const resend = new Resend(resendKey)
  const unsubscribeUrl = buildUnsubscribeUrl(input.to)
  const { result } = input

  const insightLines = result.insights.flatMap((insight) => [insight.title.toUpperCase(), insight.body, ''])

  const { error } = await resend.emails.send({
    from: 'Lumora Women <hello@lumorawomen.com>',
    to: input.to,
    subject: 'Your macros from Lumora Women',
    html: resultsHtml(input.firstName ?? null, result, unsubscribeUrl),
    text: [
      input.firstName ? `${input.firstName}, your numbers are ready.` : 'Your numbers are ready.',
      '',
      `Daily targets for ${result.goalApplied}:`,
      `Calories: ${result.calories}`,
      `Protein: ${result.proteinG}g`,
      `Carbs: ${result.carbsG}g`,
      `Fat: ${result.fatG}g`,
      `Fiber: about ${result.fiberG}g`,
      `Water: ${result.water}`,
      `Estimated maintenance: about ${result.maintenanceCalories} calories`,
      '',
      ...insightLines,
      'HOW WE GOT THESE NUMBERS',
      'We estimated your metabolism from your age, height, and weight, then layered on how you actually move through a normal day. Protein is anchored to the body you are building, fat stays high enough to support your hormones, and carbs fill the exact remainder. This is the same math we use with our one on one coaching clients.',
      '',
      'Every formula is a starting point. Eat at these numbers consistently for 2 to 3 weeks and adjust from real data. We are building a full course that teaches you to run your own numbers, and you will be the first to know.',
      '',
      `Free course: ${SITE_URL}/free-course`,
      `Coaching: ${SITE_URL}/work-with-me`,
      '',
      'With warmth,',
      'Lumora',
      '',
      'These numbers are a general guide produced by a calculation, not medical or nutritional advice. Always check with your healthcare provider before changing how you eat or train.',
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
