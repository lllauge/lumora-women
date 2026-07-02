import type { NextRequest } from 'next/server'
import { getClientIp } from '@/lib/rate-limit'
import {
  isRecaptchaAssessmentAccepted,
  type RecaptchaAssessment,
} from '@/lib/recaptcha-assessment'

function configuredHostnames(request: NextRequest) {
  const allowed = new Set([request.nextUrl.hostname.toLowerCase()])
  for (const value of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]) {
    if (!value) continue
    try {
      allowed.add(new URL(value).hostname.toLowerCase())
    } catch {
      // Invalid configured URLs are ignored; request hostname remains required.
    }
  }
  return allowed
}

export async function verifyRecaptcha(input: {
  token: string | null | undefined
  action: string
  request: NextRequest
  minimumScore?: number
}) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const apiKey = process.env.RECAPTCHA_API_KEY
  const configured = Boolean(siteKey || projectId || apiKey)

  if (!configured) {
    return process.env.NODE_ENV === 'production'
      ? { ok: false as const, reason: 'not_configured' }
      : { ok: true as const, score: 1 }
  }
  if (!siteKey || !projectId || !apiKey || !input.token) {
    return { ok: false as const, reason: 'missing_configuration_or_token' }
  }

  const response = await fetch(
    `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: {
          token: input.token,
          siteKey,
          expectedAction: input.action,
          userIpAddress: getClientIp(input.request.headers),
          userAgent: input.request.headers.get('user-agent') ?? undefined,
        },
      }),
      cache: 'no-store',
    },
  ).catch(() => null)
  if (!response?.ok) {
    console.error('[recaptcha] Assessment request failed:', response?.status ?? 'network error')
    return { ok: false as const, reason: 'assessment_failed' }
  }

  const assessment = await response.json().catch(() => null) as RecaptchaAssessment | null
  const hostname = assessment?.tokenProperties?.hostname?.toLowerCase()
  const score = assessment?.riskAnalysis?.score
  const threshold = input.minimumScore ?? 0.5
  const valid = isRecaptchaAssessmentAccepted({
    assessment,
    expectedAction: input.action,
    allowedHostnames: configuredHostnames(input.request),
    minimumScore: threshold,
  })

  if (!valid) {
    console.warn('[recaptcha] Risk check rejected.', {
      valid: assessment?.tokenProperties?.valid,
      actionMatches: assessment?.tokenProperties?.action === input.action,
      hostname,
      score,
      reasons: assessment?.riskAnalysis?.reasons,
      invalidReason: assessment?.tokenProperties?.invalidReason,
    })
    return { ok: false as const, reason: 'risk_rejected', score }
  }
  return { ok: true as const, score }
}
