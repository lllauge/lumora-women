import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSessionCookies } from '@/lib/admin-session'
import { sessionActivityCookies } from '@/lib/session-activity'

export async function GET(request: NextRequest) {
  const area = request.nextUrl.searchParams.get('area') === 'admin' ? 'admin' : 'client'
  const supabase = await createClient()
  await supabase.auth.signOut()

  const url = request.nextUrl.clone()
  url.pathname = area === 'admin' ? '/admin/login' : '/login'
  url.search = ''
  url.searchParams.set('error', 'inactive')

  const response = NextResponse.redirect(url)
  response.cookies.delete(sessionActivityCookies.admin)
  response.cookies.delete(sessionActivityCookies.client)
  response.cookies.delete(adminSessionCookies.loginAt)
  response.cookies.delete(adminSessionCookies.pending)
  response.cookies.delete(adminSessionCookies.mfa)
  response.cookies.delete(adminSessionCookies.legacyPending)
  response.cookies.delete(adminSessionCookies.legacyMfa)
  return response
}
