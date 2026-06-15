import { createHmac, timingSafeEqual } from 'crypto'

function getSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing; cannot sign unsubscribe tokens.')
  return secret
}

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function signUnsubscribeToken(email: string) {
  const normalized = email.trim().toLowerCase()
  const hmac = createHmac('sha256', getSecret()).update(normalized).digest()
  return base64url(hmac)
}

export function verifyUnsubscribeToken(email: string, token: string) {
  try {
    const expected = signUnsubscribeToken(email)
    const a = Buffer.from(expected)
    const b = Buffer.from(token)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/+$/, '')
  }
  return 'https://www.lumorawomen.com'
}

export function buildUnsubscribeUrl(email: string) {
  const token = signUnsubscribeToken(email)
  const params = new URLSearchParams({ email, token })
  return `${getSiteOrigin()}/api/unsubscribe?${params.toString()}`
}
