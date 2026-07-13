import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { searchYMoveExercises } from '@/lib/ymove-api'

export async function GET(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const url = new URL(req.url)
  try {
    const result = await searchYMoveExercises({
      search: url.searchParams.get('search') ?? '',
      muscleGroup: url.searchParams.get('muscleGroup') ?? '',
      exerciseType: url.searchParams.get('exerciseType') ?? '',
      equipment: url.searchParams.get('equipment') ?? '',
      difficulty: url.searchParams.get('difficulty') ?? '',
      pageSize: 12,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'YMove search failed.'
    return NextResponse.json({ error: message }, { status: message.includes('YMOVE_API_KEY') ? 503 : 502 })
  }
}
