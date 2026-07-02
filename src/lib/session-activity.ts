export type SessionArea = 'admin' | 'client'

export const sessionActivityCookies = {
  admin: 'lumora_admin_activity',
  client: 'lumora_client_activity',
} as const

export const sessionIdleSeconds = {
  admin: 15 * 60,
  client: 30 * 60,
} as const

export const sessionAbsoluteSeconds = {
  admin: 8 * 60 * 60,
  client: 24 * 60 * 60,
} as const

const ACTIVITY_COOKIE_LIFETIME_SECONDS = 365 * 24 * 60 * 60

function getSigningSecret() {
  const secret = process.env.SESSION_ACTIVITY_SECRET
    || process.env.ADMIN_SESSION_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('A session activity signing secret is required.')
  return secret
}

function base64UrlEncode(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index++) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return result === 0
}

async function signPayload(payload: string) {
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

export function isSessionIdle(lastActivity: number, now: number, timeoutSeconds: number) {
  return now - lastActivity > timeoutSeconds
}

export function isSessionAbsoluteExpired(startedAt: number, now: number, timeoutSeconds: number) {
  return now - startedAt > timeoutSeconds
}

export function initializeBrowserActivity(
  storedActivity: number,
  now: number,
  timeoutMilliseconds: number,
) {
  return Number.isFinite(storedActivity)
    && storedActivity > 0
    && now - storedActivity <= timeoutMilliseconds
    ? storedActivity
    : now
}

export async function createSignedActivityCookie(
  area: SessionArea,
  userId: string,
  startedAt = Math.floor(Date.now() / 1000),
) {
  const lastActivity = Math.floor(Date.now() / 1000)
  const expiresAt = lastActivity + ACTIVITY_COOKIE_LIFETIME_SECONDS
  const payload = `${area}.${userId}.${startedAt}.${lastActivity}.${expiresAt}`
  return `${payload}.${await signPayload(payload)}`
}

export async function readSignedActivityCookie(
  value: string | undefined,
  area: SessionArea,
  userId: string,
) {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 6) return null

  const [cookieArea, cookieUserId, startedAtRaw, lastActivityRaw, expiresAtRaw, signature] = parts
  if (cookieArea !== area || cookieUserId !== userId) return null

  const startedAt = Number(startedAtRaw)
  const lastActivity = Number(lastActivityRaw)
  const expiresAt = Number(expiresAtRaw)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(startedAt) || !Number.isFinite(lastActivity) || !Number.isFinite(expiresAt)) return null
  if (startedAt > lastActivity || startedAt > now + 60) return null
  if (lastActivity > now + 60 || expiresAt <= now) return null

  const payload = `${cookieArea}.${cookieUserId}.${startedAtRaw}.${lastActivityRaw}.${expiresAtRaw}`
  const expected = await signPayload(payload)
  return timingSafeEqual(signature, expected) ? { startedAt, lastActivity } : null
}

export const activityCookieMaxAge = ACTIVITY_COOKIE_LIFETIME_SECONDS
