import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'
import { getUsdaApiKey } from '@/lib/usda/api-key'
import { resyncPlansForRecipes } from '@/lib/plan-resync'

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const usdaKey = getUsdaApiKey()
  if (usdaKey.source === 'DEMO_KEY') {
    return NextResponse.json({
      error: 'Plan resync is unavailable until USDA_FDC_API_KEY is configured.',
    }, { status: 503 })
  }

  const supabase = await createAdminClient()
  const resync = await resyncPlansForRecipes({
    supabase,
    apiKey: usdaKey.key,
    allPlans: true,
  })

  if (resync.failed.length) {
    console.error('[all-plan resync] failures:', JSON.stringify(resync.failed))
  }

  return NextResponse.json({ resync })
}
