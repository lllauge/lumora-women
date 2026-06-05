import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { CoachingPlanSchema } from '@/lib/coaching-plan-schema'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const SavePlanSchema = z.object({
  clientId: z.string().uuid(),
  plan: CoachingPlanSchema,
})

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = SavePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the plan and try again.' }, { status: 400 })
  }

  const { clientId, plan } = parsed.data
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('coaching_plans')
    .upsert(
      {
        coaching_client_id: clientId,
        macro_targets: plan.macroTargets,
        meal_plan: plan.mealPlan,
        recipes: plan.recipes,
        grocery_list: plan.groceryList,
        admin_notes: plan.adminNotes,
        client_notes: plan.clientNotes,
        status: plan.status,
        generated_by_ai: plan.generatedByAi,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'coaching_client_id' }
    )

  if (error) {
    console.error('[coaching plan save] failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (plan.status === 'published') {
    await supabase
      .from('coaching_clients')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', clientId)
  }

  return NextResponse.json({ success: true })
}
