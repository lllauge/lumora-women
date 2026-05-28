import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const UuidSchema = z.string().uuid()

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/enrollments?courseId=xxx — check if current user is enrolled
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('courseId')

  if (!courseId || !UuidSchema.safeParse(courseId).success) {
    return NextResponse.json({ error: 'courseId must be a valid UUID' }, { status: 400 })
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

// POST /api/enrollments — enroll current user in a free course
export async function POST(req: NextRequest) {
  // ── Validate input ────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = z.object({ courseId: z.string().uuid() }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'courseId must be a valid UUID' }, { status: 400 })
  }

  const { courseId } = parsed.data

  // ── Verify session ────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // ── Only allow free courses through this route ────────────────────────────
  const { data: course } = await supabase
    .from('courses')
    .select('is_free')
    .eq('id', courseId)
    .single()

  if (!course?.is_free) {
    return NextResponse.json({ error: 'Paid courses require checkout' }, { status: 403 })
  }

  // Use service role for the insert (enrollment RLS no longer allows client inserts)
  const adminClient = getAdminClient()
  const { error } = await adminClient
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
