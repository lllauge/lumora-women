import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_LOGIN_PATH = '/admin/login'
const ADMIN_VERIFY_TOTP_PATH = '/admin/verify-totp'
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

  // ── Student-side gates ────────────────────────────────────────────────────
  if (path.startsWith('/dashboard') || path.startsWith('/lesson')) {
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
  }

  // ── Admin-side gates ──────────────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    const isLoginPage = path === ADMIN_LOGIN_PATH
    const isTotpPage = path === ADMIN_VERIFY_TOTP_PATH

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
    if (loginAt && !isLoginPage && !isTotpPage) {
      const loginTime = parseInt(loginAt, 10)
      const elapsed = Math.floor(Date.now() / 1000) - loginTime
      if (elapsed > ADMIN_SESSION_MAX_SECONDS) {
        // Session expired — sign out and redirect with message
        const url = request.nextUrl.clone()
        url.pathname = ADMIN_LOGIN_PATH
        url.searchParams.set('error', 'session_expired')
        const redirect = NextResponse.redirect(url)
        redirect.cookies.delete('admin_login_at')
        redirect.cookies.delete('totp_verified')
        return redirect
      }
    }

    // ── TOTP gate ─────────────────────────────────────────────────────────
    // After password login, admin must complete TOTP before accessing dashboard.
    const totpVerified = request.cookies.get('totp_verified')?.value === '1'
    const totpPending = request.cookies.get('totp_pending')?.value === '1'

    if (!isTotpPage && !isLoginPage) {
      if (totpPending && !totpVerified) {
        // Password verified but TOTP not yet done
        const url = request.nextUrl.clone()
        url.pathname = ADMIN_VERIFY_TOTP_PATH
        return NextResponse.redirect(url)
      }
    }

    // Already fully signed in as admin → skip login/totp pages
    if ((isLoginPage || isTotpPage) && totpVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
