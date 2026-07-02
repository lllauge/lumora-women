import assert from 'node:assert/strict'
import test from 'node:test'

import { isSessionIdle, sessionIdleSeconds } from './session-activity.ts'

test('uses a shorter inactivity window for administrators', () => {
  assert.equal(sessionIdleSeconds.admin, 30 * 60)
  assert.equal(sessionIdleSeconds.client, 60 * 60)
})

test('does not expire a session at the exact inactivity boundary', () => {
  const lastActivity = 1_000
  assert.equal(isSessionIdle(lastActivity, lastActivity + sessionIdleSeconds.admin, sessionIdleSeconds.admin), false)
})

test('expires a session immediately after its inactivity window', () => {
  const lastActivity = 1_000
  assert.equal(isSessionIdle(lastActivity, lastActivity + sessionIdleSeconds.client + 1, sessionIdleSeconds.client), true)
})
