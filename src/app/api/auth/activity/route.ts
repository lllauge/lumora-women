import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSameOrigin } from '@/lib/request-security'
import {
  activityCookieMaxAge,
  createSignedActivityCookie,
  isSessionAbsoluteExpired,
  isSessionIdle,
  readSignedActivityCookie,
  sessionAbsoluteSeconds,
  sessionActivityCookies,
  sessionIdleSeconds,
} from '@/lib/session-activity'

const ActivitySchema = z.object({
  area: z.enum(['admin', 'client']),
})

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const body = await request.json().catch(() => null)
  const parsed = ActivitySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid activity update.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  if (parsed.data.area === 'admin') {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }
  }

  const area = parsed.data.area
  const existing = await readSignedActivityCookie(
    request.cookies.get(sessionActivityCookies[area])?.value,
    area,
    user.id,
  )
  const now = Math.floor(Date.now() / 1000)
  if (
    existing
    && (
      isSessionIdle(existing.lastActivity, now, sessionIdleSeconds[area])
      || isSessionAbsoluteExpired(existing.startedAt, now, sessionAbsoluteSeconds[area])
    )
  ) {
    return NextResponse.json({ error: 'Session expired.' }, { status: 440 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    sessionActivityCookies[area],
    await createSignedActivityCookie(area, user.id, existing?.startedAt),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: activityCookieMaxAge,
      path: '/',
    },
  )
  return response
}
