import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createClientEmailMfaCookie,
  getSessionId,
  readClientEmailMfaCookie,
} from './client-email-mfa.ts'

process.env.CLIENT_EMAIL_MFA_SECRET = 'test-only-email-mfa-secret-with-sufficient-entropy'

test('reads the Supabase session identifier from an access token', () => {
  const payload = Buffer.from(JSON.stringify({ session_id: 'session-123' })).toString('base64url')
  assert.equal(getSessionId(`header.${payload}.signature`), 'session-123')
  assert.equal(getSessionId('not-a-token'), null)
})

test('accepts an untampered email MFA cookie for the same user and session', async () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 300
  const cookie = await createClientEmailMfaCookie('user-123', 'session-123', expiresAt)
  assert.equal(
    await readClientEmailMfaCookie(cookie, 'user-123', 'session-123'),
    true,
  )
  assert.equal(
    await readClientEmailMfaCookie(cookie, 'user-123', 'different-session'),
    false,
  )
})

test('rejects a tampered or expired email MFA cookie', async () => {
  const validCookie = await createClientEmailMfaCookie(
    'user-123',
    'session-123',
    Math.floor(Date.now() / 1000) + 300,
  )
  assert.equal(
    await readClientEmailMfaCookie(`${validCookie}x`, 'user-123', 'session-123'),
    false,
  )

  const expiredCookie = await createClientEmailMfaCookie(
    'user-123',
    'session-123',
    Math.floor(Date.now() / 1000) - 1,
  )
  assert.equal(
    await readClientEmailMfaCookie(expiredCookie, 'user-123', 'session-123'),
    false,
  )
})
