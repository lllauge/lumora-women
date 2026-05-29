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
    const html = await res.text()
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch {
    return new NextResponse('Proxy error', { status: 502 })
  }
}
