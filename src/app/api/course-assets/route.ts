import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getR2Object, getR2ObjectKeyFromUrl } from '@/lib/r2'

function toWebStream(body: unknown): ReadableStream | null {
  if (!body) return null
  if (body instanceof ReadableStream) return body

  const maybeWebStream = body as { transformToWebStream?: () => ReadableStream }
  if (typeof maybeWebStream.transformToWebStream === 'function') {
    return maybeWebStream.transformToWebStream()
  }

  return null
}

function contentDisposition(filename: string | null, inline: boolean) {
  if (!filename) return inline ? 'inline' : 'attachment'
  const safeName = filename.replace(/["\r\n]/g, '')
  return `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`
}

async function canAccessAsset(req: NextRequest, assetUrl: string) {
  const supabase = await createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  let user = cookieUser

  if (!user) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]

    if (token) {
      const { data } = await supabase.auth.getUser(token)
      user = data.user
    }
  }

  if (!user) {
    return { allowed: false, status: 401, filename: null, inline: true, isHtml: false }
  }

  const db = await createAdminClient()

  const { data: profile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'

  const { data: videoLesson } = await db
    .from('lessons')
    .select('id, title, modules(course_id)')
    .eq('video_url', assetUrl)
    .maybeSingle()

  if (videoLesson) {
    const courseId = ((videoLesson.modules as { course_id?: string } | null)?.course_id) ?? null
    const enrolled = isAdmin || (courseId
      ? await userIsEnrolled(db, user.id, courseId)
      : false)

    return {
      allowed: enrolled,
      status: enrolled ? 200 : 404,
      filename: videoLesson.title ? `${videoLesson.title}.mp4` : null,
      inline: true,
      isHtml: false,
    }
  }

  // Admins need to preview any course asset while editing. Students use their
  // session-scoped client so Supabase RLS keeps the enrollment check in place.
  const downloadQueryClient = isAdmin ? db : supabase
  const { data: download } = await downloadQueryClient
    .from('downloads')
    .select('id, file_name, file_type')
    .eq('file_url', assetUrl)
    .maybeSingle()

  if (download) {
    const isHtml =
      (typeof download.file_type === 'string' && /text\/html\b/i.test(download.file_type)) ||
      (typeof download.file_name === 'string' && /\.html?$/i.test(download.file_name))
    return {
      allowed: true,
      status: 200,
      filename: download.file_name ?? null,
      inline: isHtml,
      isHtml,
    }
  }

  console.error('[course-assets] asset not found or access denied:', { assetUrl, userId: user.id })
  return { allowed: false, status: 404, filename: null, inline: true, isHtml: false }
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function serveExternalAsset(assetUrl: string, access: { filename: string | null; inline: boolean; isHtml: boolean }) {
  if (!isHttpUrl(assetUrl)) {
    return NextResponse.json(
      { error: 'Only HTTP(S) download URLs can be served through this route.' },
      { status: 400 }
    )
  }

  if (!access.isHtml) {
    return NextResponse.redirect(assetUrl)
  }

  try {
    const response = await fetch(assetUrl, {
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Could not load asset.' }, { status: 502 })
    }

    const headers = new Headers()
    headers.set('Cache-Control', 'private, no-store')
    headers.set('Content-Type', response.headers.get('content-type') ?? 'text/html; charset=utf-8')
    headers.set('Content-Disposition', contentDisposition(access.filename, access.inline))
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set(
      'Content-Security-Policy',
      [
        "default-src 'none'",
        "script-src 'none'",
        "object-src 'none'",
        "img-src https: data:",
        "style-src 'unsafe-inline' https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com data:",
        "connect-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'self'",
      ].join('; ')
    )

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (err) {
    console.error('[course-assets] failed to serve external asset:', err)
    return NextResponse.json({ error: 'Could not load asset.' }, { status: 502 })
  }
}

async function userIsEnrolled(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  courseId: string
) {
  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  return !!data
}

export async function GET(req: NextRequest) {
  const assetUrl = req.nextUrl.searchParams.get('url')
  if (!assetUrl) {
    return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 })
  }

  const access = await canAccessAsset(req, assetUrl)
  if (!access.allowed) {
    return NextResponse.json({ error: access.status === 401 ? 'Not authenticated.' : 'Asset not found.' }, { status: access.status })
  }

  const key = getR2ObjectKeyFromUrl(assetUrl)
  if (!key) {
    return serveExternalAsset(assetUrl, access)
  }

  try {
    const range = req.headers.get('range')
    const object = await getR2Object(key, range)
    const stream = toWebStream(object.Body)

    if (!stream) {
      return NextResponse.json({ error: 'Could not stream asset.' }, { status: 502 })
    }

    const headers = new Headers()
    const contentType = object.ContentType ?? 'application/octet-stream'
    const isHtml = access.isHtml || contentType.toLowerCase().includes('text/html')

    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'private, no-store')
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', contentDisposition(access.filename, access.inline))
    headers.set('X-Content-Type-Options', 'nosniff')

    if (isHtml) {
      headers.set(
        'Content-Security-Policy',
        [
          "default-src 'none'",
          "script-src 'none'",
          "object-src 'none'",
          "img-src https: data:",
          "style-src 'unsafe-inline' https://fonts.googleapis.com",
          "font-src https://fonts.gstatic.com data:",
          "connect-src 'none'",
          "base-uri 'none'",
          "form-action 'none'",
          "frame-ancestors 'self'",
        ].join('; ')
      )
    }

    if (object.ContentLength !== undefined) {
      headers.set('Content-Length', String(object.ContentLength))
    }
    if (object.ContentRange) {
      headers.set('Content-Range', object.ContentRange)
    }

    return new NextResponse(stream, {
      status: object.ContentRange ? 206 : 200,
      headers,
    })
  } catch (err) {
    console.error('[course-assets] failed to serve asset:', err)
    return NextResponse.json({ error: 'Could not load asset.' }, { status: 502 })
  }
}
