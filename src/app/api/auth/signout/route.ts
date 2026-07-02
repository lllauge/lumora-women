import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { adminSessionCookies } from '@/lib/admin-session'
import { sessionActivityCookies } from '@/lib/session-activity'
import { clientEmailMfaCookie } from '@/lib/client-email-mfa'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin),
    303
  )
  response.cookies.delete(sessionActivityCookies.admin)
  response.cookies.delete(sessionActivityCookies.client)
  response.cookies.delete(clientEmailMfaCookie)
  response.cookies.delete(adminSessionCookies.loginAt)
  response.cookies.delete(adminSessionCookies.pending)
  response.cookies.delete(adminSessionCookies.mfa)
  response.cookies.delete(adminSessionCookies.legacyPending)
  response.cookies.delete(adminSessionCookies.legacyMfa)
  return response
}
