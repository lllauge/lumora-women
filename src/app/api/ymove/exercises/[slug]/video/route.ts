import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { bestYMoveVideoUrl, getYMoveExercise } from '@/lib/ymove-api'

async function canViewYMoveVideo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const admin = await createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role === 'admin') return true

  const { data: client } = await admin
    .from('coaching_clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (client) return true

  // Course students: exercise-library lessons reference YMove demo videos,
  // so anyone enrolled in a course may stream them too.
  const { data: enrollment } = await admin
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  return Boolean(enrollment)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await canViewYMoveVideo())) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { slug } = await params
  try {
    const exercise = await getYMoveExercise(slug)
    const videoUrl = bestYMoveVideoUrl(exercise)
    if (!videoUrl) {
      return NextResponse.json({ error: 'YMove did not return a video for this exercise.' }, { status: 404 })
    }
    return NextResponse.redirect(videoUrl, 302)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load YMove video.'
    return NextResponse.json({ error: message }, { status: message.includes('YMOVE_API_KEY') ? 503 : 502 })
  }
}
