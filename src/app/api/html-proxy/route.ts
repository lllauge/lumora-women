import { NextRequest, NextResponse } from 'next/server'
import { getR2Config } from '@/lib/r2'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  // Only proxy URLs from our own R2 bucket to prevent SSRF
  const config = getR2Config()
  if (!config || !url.startsWith(config.publicUrl + '/')) {
    return new NextResponse('URL not allowed', { status: 403 })
  }

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return new NextResponse('Failed to fetch resource', { status: res.status })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('text/html')) {
      return new NextResponse('Only HTML resources can be proxied here', { status: 415 })
    }

    const html = await res.text()
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
        // This route exists only to render stored HTML. Never allow it to run JS
        // in the app's origin.
        'Content-Security-Policy': [
          "default-src 'none'",
          "img-src https: data:",
          "style-src 'unsafe-inline'",
          "font-src data:",
          "base-uri 'none'",
          "form-action 'none'",
          "frame-ancestors 'none'",
        ].join('; '),
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Proxy error', { status: 502 })
  }
}
