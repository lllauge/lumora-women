const ADMIN_MFA_COOKIE = 'admin_mfa'
const ADMIN_TOTP_PENDING_COOKIE = 'admin_totp_pending'

type CookieKind = 'mfa' | 'totp-pending'

export const adminSessionCookies = {
  mfa: ADMIN_MFA_COOKIE,
  pending: ADMIN_TOTP_PENDING_COOKIE,
  legacyMfa: 'totp_verified',
  legacyPending: 'totp_pending',
  loginAt: 'admin_login_at',
} as const

function getSigningSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured.')
  }
  return secret
}

function base64UrlEncode(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSigningSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return base64UrlEncode(signature)
}

export async function createSignedAdminCookie(kind: CookieKind, userId: string, maxAgeSeconds: number) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + maxAgeSeconds
  const payload = `${kind}.${userId}.${issuedAt}.${expiresAt}`
  const signature = await signPayload(payload)
  return `${payload}.${signature}`
}

export async function verifySignedAdminCookie(
  value: string | undefined,
  kind: CookieKind,
  userId: string
) {
  if (!value) return false

  const parts = value.split('.')
  if (parts.length !== 5) return false

  const [cookieKind, cookieUserId, issuedAtRaw, expiresAtRaw, signature] = parts
  if (cookieKind !== kind || cookieUserId !== userId) return false

  const issuedAt = Number(issuedAtRaw)
  const expiresAt = Number(expiresAtRaw)
  const now = Math.floor(Date.now() / 1000)

  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return false
  if (issuedAt > now + 60 || expiresAt <= now) return false

  const payload = `${cookieKind}.${cookieUserId}.${issuedAtRaw}.${expiresAtRaw}`
  const expected = await signPayload(payload)
  return timingSafeEqual(signature, expected)
}
