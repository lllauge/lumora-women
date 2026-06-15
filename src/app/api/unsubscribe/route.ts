import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function unsubscribe(email: string) {
  const supabase = getServiceClient()
  await supabase.from('email_subscribers').delete().eq('email', email)
}

function renderPage(opts: { ok: boolean; email?: string }) {
  const title = opts.ok ? 'You are unsubscribed' : 'Link expired or invalid'
  const message = opts.ok
    ? `We have removed ${opts.email ? `<strong>${opts.email}</strong>` : 'your email'} from our list. We are sorry to see you go, and we wish you well.`
    : 'This unsubscribe link is no longer valid. If you need help, please write to hello@lumorawomen.com.'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title} · Lumora Women</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #F8F6F0; color: #1A2818; margin: 0; padding: 48px 16px; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .card { max-width: 480px; width: 100%; background: #FFFFFF; border-radius: 16px; padding: 36px; border: 1px solid #E5E0D6; text-align: center; }
      h1 { font-family: Georgia, serif; font-size: 28px; margin: 0 0 16px; color: #1A2818; }
      p { font-size: 16px; line-height: 1.7; color: #3A4A38; margin: 0 0 16px; }
      a { color: #4A7A40; }
      .brand { font-family: Georgia, serif; font-size: 20px; color: #C8980A; margin-bottom: 24px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">Lumora</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <p><a href="https://www.lumorawomen.com">Return to Lumora Women</a></p>
    </div>
  </body>
</html>`
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  const token = req.nextUrl.searchParams.get('token')
  const ok = !!(email && token && verifyUnsubscribeToken(email, token))
  if (ok) await unsubscribe(email!)
  return new NextResponse(renderPage({ ok, email: ok ? email! : undefined }), {
    status: ok ? 200 : 400,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

// Gmail/Yahoo one-click unsubscribe (RFC 8058)
export async function POST(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  const token = req.nextUrl.searchParams.get('token')
  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 400 })
  }
  await unsubscribe(email)
  return NextResponse.json({ ok: true })
}
