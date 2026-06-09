import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { getUsdaApiKey } from '@/lib/usda/api-key'
import { searchFoodsForPicker } from '@/lib/usda/food-data'

export async function GET(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const apiKey = getUsdaApiKey()

  try {
    const results = await searchFoodsForPicker(q, apiKey.key)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
