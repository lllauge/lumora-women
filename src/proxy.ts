import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { adminSessionCookies } from '@/lib/admin-session'
import {
  clientEmailMfaCookie,
  getSessionId,
  readClientEmailMfaCookie,
} from '@/lib/client-email-mfa'
import {
  activityCookieMaxAge,
  createSignedActivityCookie,
  isSessionAbsoluteExpired,
  isSessionIdle,
  readSignedActivityCookie,
  sessionActivityCookies,
  sessionAbsoluteSeconds,
  sessionIdleSeconds,
  type SessionArea,
} from '@/lib/session-activity'

const ADMIN_LOGIN_PATH = '/admin/login'
const ADMIN_SESSION_MAX_SECONDS = 8 * 60 * 60 // 8 hours

/** Parse the ADMIN_ALLOWED_IPS env var into a Set of trimmed IP strings. */
function getAllowedAdminIps(): Set<string> | null {
  const raw = process.env.ADMIN_ALLOWED_IPS
  if (!raw?.trim()) return null // not configured → no restriction
  const ips = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return ips.length > 0 ? new Set(ips) : null
}

/** Best-effort client IP from Cloudflare / load balancer headers. */
function getClientIp(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth checks if Supabase isn't configured yet
  if (!supabaseUrl?.startsWith('http') || !supabaseKey) {
    return NextResponse.next({ request })
  }

  const path = request.nextUrl.pathname
  const clientIp = getClientIp(request)

  // ── Admin IP allowlisting ─────────────────────────────────────────────────
  // If ADMIN_ALLOWED_IPS is set and the request is for any admin path,
  // return 404 for IPs not on the list (makes the portal invisible).
  if (path.startsWith('/admin')) {
    const allowedIps = getAllowedAdminIps()
    if (allowedIps && !allowedIps.has(clientIp)) {
      return new NextResponse(null, { status: 404 })
    }
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  async function enforceActivity(area: SessionArea) {
    if (!user) return null
    const cookieName = sessionActivityCookies[area]
    const activity = await readSignedActivityCookie(
      request.cookies.get(cookieName)?.value,
      area,
      user.id,
    )
    const now = Math.floor(Date.now() / 1000)
    if (
      activity
      && (
        isSessionIdle(activity.lastActivity, now, sessionIdleSeconds[area])
        || isSessionAbsoluteExpired(activity.startedAt, now, sessionAbsoluteSeconds[area])
      )
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/api/auth/idle-signout'
      url.search = ''
      url.searchParams.set('area', area)
      return NextResponse.redirect(url)
    }
    if (!activity) {
      response.cookies.set(cookieName, await createSignedActivityCookie(area, user.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: activityCookieMaxAge,
        path: '/',
      })
    }
    return null
  }

  // ── Student-side gates ────────────────────────────────────────────────────
  const isCoachingPortal =
    path.startsWith('/coaching/onboarding') ||
    path.startsWith('/coaching/today') ||
    path.startsWith('/coaching/plan') ||
    path.startsWith('/coaching/progress') ||
    path.startsWith('/coaching/coach')
  if (path.startsWith('/dashboard') || path.startsWith('/lesson') || isCoachingPortal) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', path)
      return NextResponse.redirect(url)
    }

    // Email verification gate — block course access for unverified accounts
    const session = await supabase.auth.getSession()
    const emailVerified = session.data.session?.user?.email_confirmed_at
    if (!emailVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }

    // A login is only good for the absolute session window, no matter how the
    // session was kept alive. Without this, a session from before the
    // activity-cookie system shipped (or one whose cookies were lost) walks in
    // on a months-old password login with only an email code. Token refreshes
    // don't update last_sign_in_at, so this measures the real login.
    const lastSignInSeconds = user.last_sign_in_at
      ? Math.floor(new Date(user.last_sign_in_at).getTime() / 1000)
      : 0
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (
      !lastSignInSeconds
      || isSessionAbsoluteExpired(lastSignInSeconds, nowSeconds, sessionAbsoluteSeconds.client)
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/api/auth/idle-signout'
      url.search = ''
      url.searchParams.set('area', 'client')
      return NextResponse.redirect(url)
    }

    const sessionId = getSessionId(session.data.session?.access_token)
    const emailMfaVerified = sessionId
      ? await readClientEmailMfaCookie(
          request.cookies.get(clientEmailMfaCookie)?.value,
          user.id,
          sessionId,
        )
      : false
    if (!emailMfaVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa'
      url.search = ''
      url.searchParams.set('area', 'client')
      url.searchParams.set('redirectTo', path)
      return NextResponse.redirect(url)
    }

    const idleRedirect = await enforceActivity('client')
    if (idleRedirect) return idleRedirect
  }

  if (path === '/mfa') {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', '/mfa')
      return NextResponse.redirect(url)
    }
    const requestedArea = request.nextUrl.searchParams.get('area')
    if (requestedArea === 'admin') {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.search = ''
        return NextResponse.redirect(url)
      }
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance?.currentLevel === 'aal2') {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo')
        const safeDestination = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/admin'
        return NextResponse.redirect(new URL(safeDestination, request.url))
      }
    } else {
      const session = await supabase.auth.getSession()
      const sessionId = getSessionId(session.data.session?.access_token)
      const emailMfaVerified = sessionId
        ? await readClientEmailMfaCookie(
            request.cookies.get(clientEmailMfaCookie)?.value,
            user.id,
            sessionId,
          )
        : false
      if (emailMfaVerified) {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo')
        const safeDestination = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/dashboard'
        return NextResponse.redirect(new URL(safeDestination, request.url))
      }
    }
  }

  // ── Admin-side gates ──────────────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    const isLoginPage = path === ADMIN_LOGIN_PATH

    // No session → bounce to admin login
    if (!user) {
      if (!isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = ADMIN_LOGIN_PATH
        return NextResponse.redirect(url)
      }
      return response
    }

    // Signed in → look up role
    const { data: profile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = !error && profile?.role === 'admin'

    if (!isAdmin) {
      if (!isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = ADMIN_LOGIN_PATH
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
      return response
    }

    // ── Admin session timeout (8 hours) ──────────────────────────────────
    const loginAt = request.cookies.get('admin_login_at')?.value
    if (loginAt && !isLoginPage) {
      const loginTime = parseInt(loginAt, 10)
      const elapsed = Math.floor(Date.now() / 1000) - loginTime
      if (elapsed > ADMIN_SESSION_MAX_SECONDS) {
        // Session expired — sign out and redirect with message
        const url = request.nextUrl.clone()
        url.pathname = ADMIN_LOGIN_PATH
        url.searchParams.set('error', 'session_expired')
        const redirect = NextResponse.redirect(url)
        redirect.cookies.delete(adminSessionCookies.loginAt)
        redirect.cookies.delete(adminSessionCookies.pending)
        redirect.cookies.delete(adminSessionCookies.mfa)
        redirect.cookies.delete(adminSessionCookies.legacyPending)
        redirect.cookies.delete(adminSessionCookies.legacyMfa)
        return redirect
      }
    }

    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const mfaVerified = assurance?.currentLevel === 'aal2'
    if (!isLoginPage && !mfaVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa'
      url.search = ''
      url.searchParams.set('area', 'admin')
      url.searchParams.set('mode', assurance?.nextLevel === 'aal2' ? 'challenge' : 'enroll')
      url.searchParams.set('redirectTo', '/admin')
      return NextResponse.redirect(url)
    }

    if (isLoginPage && !mfaVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa'
      url.search = ''
      url.searchParams.set('area', 'admin')
      url.searchParams.set('mode', assurance?.nextLevel === 'aal2' ? 'challenge' : 'enroll')
      url.searchParams.set('redirectTo', '/admin')
      return NextResponse.redirect(url)
    }

    if (isLoginPage && mfaVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (mfaVerified) {
      const idleRedirect = await enforceActivity('admin')
      if (idleRedirect) return idleRedirect
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
