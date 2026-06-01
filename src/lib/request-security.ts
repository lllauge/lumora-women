import { NextRequest, NextResponse } from 'next/server'

function normalizeOrigin(value: string | null) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function allowedOrigins(req: NextRequest) {
  const origins = new Set<string>()
  const requestOrigin = normalizeOrigin(req.nextUrl.origin)
  const configuredSite = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? null)
  const configuredApp = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null)

  if (requestOrigin) origins.add(requestOrigin)
  if (configuredSite) origins.add(configuredSite)
  if (configuredApp) origins.add(configuredApp)

  return origins
}

export function requireSameOrigin(req: NextRequest) {
  const origin = normalizeOrigin(req.headers.get('origin'))
  const referer = normalizeOrigin(req.headers.get('referer'))
  const allowed = allowedOrigins(req)

  // Browser form/fetch mutations should send Origin. If absent, fall back to
  // Referer for older browser edge cases, then fail closed in production.
  const candidate = origin ?? referer
  if (!candidate) {
    return process.env.NODE_ENV === 'production'
      ? NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
      : null
  }

  if (!allowed.has(candidate)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  return null
}
