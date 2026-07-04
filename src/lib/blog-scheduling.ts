import { createAdminClient } from '@/lib/supabase/server'

/**
 * Flip any scheduled blog posts whose time has come over to published.
 *
 * Called at read time from the public blog pages so scheduled posts go live
 * on schedule even with no cron configured — the first visitor after the
 * scheduled moment publishes the post. The /api/blog/publish-due cron does
 * the same flip on a timer; both are idempotent. Failures are swallowed:
 * a scheduling hiccup must never take down a public page.
 */
export async function publishDueBlogPosts(): Promise<void> {
  try {
    const supabase = await createAdminClient()
    const nowIso = new Date().toISOString()
    await supabase
      .from('blog_posts')
      .update({ published: true, published_at: nowIso })
      .eq('published', false)
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', nowIso)
  } catch (err) {
    console.error('[blog-scheduling] publish-due sweep failed:', err instanceof Error ? err.message : err)
  }
}
