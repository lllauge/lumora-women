import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'
  if (isAdmin) {
    return { allowed: true, status: 200, filename: null, inline: true, isHtml: false }
  }

  const { data: videoLesson } = await supabase
    .from('lessons')
    .select('id, title, modules(course_id)')
    .eq('video_url', assetUrl)
    .maybeSingle()

  if (videoLesson) {
    const courseId = ((videoLesson.modules as { course_id?: string } | null)?.course_id) ?? null
    const enrolled = courseId
      ? await userIsEnrolled(supabase, user.id, courseId)
      : false

    return {
      allowed: enrolled,
      status: enrolled ? 200 : 404,
      filename: videoLesson.title ? `${videoLesson.title}.mp4` : null,
      inline: true,
      isHtml: false,
    }
  }

  const { data: download } = await supabase
    .from('downloads')
    .select('id, file_name, file_type, lessons(modules(course_id))')
    .eq('file_url', assetUrl)
    .maybeSingle()

  if (download) {
    const lesson = download.lessons as { modules?: { course_id?: string } | null } | null
    const courseId = lesson?.modules?.course_id ?? null
    const enrolled = courseId
      ? await userIsEnrolled(supabase, user.id, courseId)
      : false

    return {
      allowed: enrolled,
      status: enrolled ? 200 : 404,
      filename: download.file_name ?? null,
      inline: download.file_type === 'text/html',
      isHtml: download.file_type === 'text/html',
    }
  }

  return { allowed: false, status: 404, filename: null, inline: true, isHtml: false }
}

async function userIsEnrolled(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  const key = getR2ObjectKeyFromUrl(assetUrl)
  if (!key) {
    return NextResponse.json(
      { error: 'Only Lumora-hosted R2 course assets can be served through this protected route.' },
      { status: 400 }
    )
  }

  const access = await canAccessAsset(req, assetUrl)
  if (!access.allowed) {
    return NextResponse.json({ error: access.status === 401 ? 'Not authenticated.' : 'Asset not found.' }, { status: access.status })
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
