import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/enrollments?courseId=xxx — check if current user is enrolled
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ enrolled: false })
  }

  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  return NextResponse.json({ enrolled: !!data })
}

// POST /api/enrollments — enroll current user in a course (free courses only)
export async function POST(req: NextRequest) {
  const { courseId } = await req.json()

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Only allow free courses through this route
  const { data: course } = await supabase
    .from('courses')
    .select('is_free')
    .eq('id', courseId)
    .single()

  if (!course?.is_free) {
    return NextResponse.json({ error: 'Paid courses require checkout' }, { status: 403 })
  }

  const { error } = await supabase
    .from('enrollments')
    .upsert(
      { user_id: user.id, course_id: courseId },
      { onConflict: 'user_id,course_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrolled: true })
}
