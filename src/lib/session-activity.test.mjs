import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isSessionAbsoluteExpired,
  isSessionIdle,
  initializeBrowserActivity,
  sessionAbsoluteSeconds,
  sessionIdleSeconds,
} from './session-activity.ts'

test('uses a shorter inactivity window for administrators', () => {
  assert.equal(sessionIdleSeconds.admin, 15 * 60)
  assert.equal(sessionIdleSeconds.client, 12 * 60 * 60)
})

test('enforces absolute session lifetimes even while the user stays active', () => {
  const startedAt = 1_000
  assert.equal(
    isSessionAbsoluteExpired(startedAt, startedAt + sessionAbsoluteSeconds.admin + 1, sessionAbsoluteSeconds.admin),
    true,
  )
  assert.equal(
    isSessionAbsoluteExpired(startedAt, startedAt + sessionAbsoluteSeconds.client, sessionAbsoluteSeconds.client),
    false,
  )
})

test('does not expire a session at the exact inactivity boundary', () => {
  const lastActivity = 1_000
  assert.equal(isSessionIdle(lastActivity, lastActivity + sessionIdleSeconds.admin, sessionIdleSeconds.admin), false)
})

test('expires a session immediately after its inactivity window', () => {
  const lastActivity = 1_000
  assert.equal(isSessionIdle(lastActivity, lastActivity + sessionIdleSeconds.client + 1, sessionIdleSeconds.client), true)
})

test('starts a fresh browser activity window after a new login', () => {
  const now = 2_000_000
  const timeout = 15 * 60 * 1000
  assert.equal(initializeBrowserActivity(now - timeout - 1, now, timeout), now)
  assert.equal(initializeBrowserActivity(now - 1_000, now, timeout), now - 1_000)
})
