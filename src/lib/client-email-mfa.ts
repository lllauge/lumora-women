export const clientEmailMfaCookie = 'lumora_client_email_mfa'
export const clientEmailMfaLifetimeSeconds = 24 * 60 * 60

function getSigningSecret() {
  const secret = process.env.CLIENT_EMAIL_MFA_SECRET
    || process.env.SESSION_ACTIVITY_SECRET
    || process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('A client email MFA signing secret is required.')
  return secret
}

function base64UrlEncode(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return atob(padded)
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index++) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return result === 0
}

export function clientEmailMfaValuesMatch(left: string, right: string) {
  return timingSafeEqual(left, right)
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSigningSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return base64UrlEncode(signature)
}

export function getSessionId(accessToken: string | undefined) {
  if (!accessToken) return null
  try {
    const payload = JSON.parse(decodeBase64Url(accessToken.split('.')[1])) as { session_id?: unknown }
    return typeof payload.session_id === 'string' && payload.session_id ? payload.session_id : null
  } catch {
    return null
  }
}

export async function hashClientEmailMfaCode(
  userId: string,
  sessionId: string,
  code: string,
) {
  return sign(`code.${userId}.${sessionId}.${code}`)
}

export async function createClientEmailMfaCookie(
  userId: string,
  sessionId: string,
  expiresAt = Math.floor(Date.now() / 1000) + clientEmailMfaLifetimeSeconds,
) {
  const payload = `v1.${userId}.${sessionId}.${expiresAt}`
  return `${payload}.${await sign(payload)}`
}

export async function readClientEmailMfaCookie(
  value: string | undefined,
  userId: string,
  sessionId: string,
) {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 5) return false
  const [version, cookieUserId, cookieSessionId, expiresAtRaw, signature] = parts
  if (version !== 'v1' || cookieUserId !== userId || cookieSessionId !== sessionId) return false
  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false
  const expected = await sign(`${version}.${cookieUserId}.${cookieSessionId}.${expiresAtRaw}`)
  return timingSafeEqual(signature, expected)
}
