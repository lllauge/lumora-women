import assert from 'node:assert/strict'
import test from 'node:test'

import { isRecaptchaAssessmentAccepted } from './recaptcha-assessment.ts'

const validAssessment = {
  tokenProperties: {
    valid: true,
    hostname: 'lumorawomen.com',
    action: 'login',
  },
  riskAnalysis: { score: 0.9 },
}

test('accepts a valid score for the expected action and hostname', () => {
  assert.equal(isRecaptchaAssessmentAccepted({
    assessment: validAssessment,
    expectedAction: 'login',
    allowedHostnames: new Set(['lumorawomen.com']),
    minimumScore: 0.5,
  }), true)
})

test('rejects low scores and action replay', () => {
  assert.equal(isRecaptchaAssessmentAccepted({
    assessment: { ...validAssessment, riskAnalysis: { score: 0.2 } },
    expectedAction: 'login',
    allowedHostnames: new Set(['lumorawomen.com']),
    minimumScore: 0.5,
  }), false)
  assert.equal(isRecaptchaAssessmentAccepted({
    assessment: validAssessment,
    expectedAction: 'signup',
    allowedHostnames: new Set(['lumorawomen.com']),
    minimumScore: 0.5,
  }), false)
})

test('rejects tokens issued for another hostname', () => {
  assert.equal(isRecaptchaAssessmentAccepted({
    assessment: validAssessment,
    expectedAction: 'login',
    allowedHostnames: new Set(['preview.example.com']),
    minimumScore: 0.5,
  }), false)
})
