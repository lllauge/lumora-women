import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const ExerciseSchema = z.object({
  name: z.string().min(1),
  movement_pattern: z.string().default('accessory'),
  primary_muscles: z.array(z.string()).default([]),
  equipment: z.string().default('bodyweight'),
  difficulty: z.string().default('beginner'),
  default_sets: z.string().default('3'),
  default_reps: z.string().default('10'),
  default_rest: z.string().default('60s'),
  cues: z.string().default(''),
  video_url: z.string().default(''),
  female_recomp_priority: z.number().int().min(0).max(2).default(0),
  archived: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .order('movement_pattern')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercises: data ?? [] })
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = ExerciseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid exercise data.' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('exercise_library')
    .insert({ ...parsed.data, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercise: data })
}
