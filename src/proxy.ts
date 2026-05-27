import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_LOGIN_PATH = '/admin/login'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth checks if Supabase isn't configured yet
  if (!supabaseUrl?.startsWith('http') || !supabaseKey) {
    return NextResponse.next({ request })
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
  const path = request.nextUrl.pathname

  // ── Student-side gates ────────────────────────────────────────────────────
  if (path.startsWith('/dashboard') || path.startsWith('/lesson')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', path)
      return NextResponse.redirect(url)
    }
  }

  // ── Admin-side gates ──────────────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    const isLoginPage = path === ADMIN_LOGIN_PATH

    // No session → bounce to admin login (unless already there)
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
      // Authenticated but not admin → kick out of /admin/*. Sign-out happens
      // on the login page; we just send them there with a flag.
      if (!isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = ADMIN_LOGIN_PATH
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
      return response
    }

    // Already signed in as admin and hitting /admin/login → forward to dash
    if (isLoginPage) {
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
