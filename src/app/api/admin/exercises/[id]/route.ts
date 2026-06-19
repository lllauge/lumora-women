import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const ExerciseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  movement_pattern: z.string().optional(),
  primary_muscles: z.array(z.string()).optional(),
  equipment: z.string().optional(),
  difficulty: z.string().optional(),
  default_sets: z.string().optional(),
  default_reps: z.string().optional(),
  default_rest: z.string().optional(),
  cues: z.string().optional(),
  video_url: z.string().optional(),
  female_recomp_priority: z.number().int().min(0).max(2).optional(),
  archived: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = ExerciseUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid exercise data.' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('exercise_library')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercise: data })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('exercise_library')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
