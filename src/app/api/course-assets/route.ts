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

async function canAccessAsset(assetUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false, status: 401, filename: null, inline: true }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'

  const { data: videoLesson } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('video_url', assetUrl)
    .maybeSingle()

  if (videoLesson || isAdmin) {
    return {
      allowed: !!videoLesson || isAdmin,
      status: videoLesson || isAdmin ? 200 : 404,
      filename: videoLesson?.title ? `${videoLesson.title}.mp4` : null,
      inline: true,
    }
  }

  const { data: download } = await supabase
    .from('downloads')
    .select('id, file_name, file_type')
    .eq('file_url', assetUrl)
    .maybeSingle()

  if (download) {
    return {
      allowed: true,
      status: 200,
      filename: download.file_name ?? null,
      inline: download.file_type === 'text/html',
    }
  }

  return { allowed: false, status: 404, filename: null, inline: true }
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

  const access = await canAccessAsset(assetUrl)
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
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'private, no-store')
    headers.set('Content-Type', object.ContentType ?? 'application/octet-stream')
    headers.set('Content-Disposition', contentDisposition(access.filename, access.inline))
    headers.set('X-Content-Type-Options', 'nosniff')

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
