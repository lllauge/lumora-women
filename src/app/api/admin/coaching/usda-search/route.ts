import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { getUsdaApiKey } from '@/lib/usda/api-key'
import { getFoodMeasuresById, searchFoodsForPicker } from '@/lib/usda/food-data'
import { searchCuratedBrandedFoods } from '@/lib/curated-branded-foods'

export async function GET(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const apiKey = getUsdaApiKey()

  // ?fdcId=… returns household measures for one food (used after selection).
  const fdcIdParam = req.nextUrl.searchParams.get('fdcId')
  if (fdcIdParam) {
    const fdcId = Number.parseInt(fdcIdParam, 10)
    if (!Number.isFinite(fdcId) || fdcId <= 0) return NextResponse.json({ measures: [] })
    try {
      return NextResponse.json({ measures: await getFoodMeasuresById(fdcId, apiKey.key) })
    } catch {
      return NextResponse.json({ measures: [] })
    }
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const curated = searchCuratedBrandedFoods(q)
  try {
    const results = await searchFoodsForPicker(q, apiKey.key)
    return NextResponse.json({ results: [...curated, ...results] })
  } catch {
    return NextResponse.json({ results: curated })
  }
}
