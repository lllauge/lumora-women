export type RecaptchaAssessment = {
  tokenProperties?: {
    valid?: boolean
    hostname?: string
    action?: string
    invalidReason?: string
  }
  riskAnalysis?: {
    score?: number
    reasons?: string[]
  }
}

export function isRecaptchaAssessmentAccepted(input: {
  assessment: RecaptchaAssessment | null
  expectedAction: string
  allowedHostnames: Set<string>
  minimumScore: number
}) {
  const hostname = input.assessment?.tokenProperties?.hostname?.toLowerCase()
  const score = input.assessment?.riskAnalysis?.score
  return input.assessment?.tokenProperties?.valid === true
    && input.assessment.tokenProperties.action === input.expectedAction
    && Boolean(hostname && input.allowedHostnames.has(hostname))
    && typeof score === 'number'
    && score >= input.minimumScore
}
