import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Flips any scheduled blog posts whose time has come over to published.
 * Designed to be hit by a cron (Vercel Cron, GitHub Actions, etc.) every
 * minute — but also safe to invoke manually.
 *
 * Auth model: takes a shared secret in the Authorization header. The header
 * value is read from CRON_SECRET. If the env var is empty, the endpoint is
 * disabled (returns 503) so it can't be discovered accidentally.
 *
 *   curl -X POST https://example.com/api/blog/publish-due \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not configured.' },
      { status: 503 }
    )
  }
  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const nowIso = new Date().toISOString()

  // Find due posts first so we can report how many got flipped.
  const { data: due, error: dueErr } = await supabase
    .from('blog_posts')
    .select('id, scheduled_at')
    .eq('published', false)
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', nowIso)

  if (dueErr) {
    return NextResponse.json({ ok: false, error: dueErr.message }, { status: 500 })
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, published: 0 })
  }

  const { error: updErr } = await supabase
    .from('blog_posts')
    .update({ published: true, published_at: nowIso })
    .in('id', due.map((p) => p.id))

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, published: due.length, ids: due.map((p) => p.id) })
}

/** Health check only. Publishing is intentionally POST-only. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'publish-due', method: 'POST' })
}
