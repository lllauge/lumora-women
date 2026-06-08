import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { CoachingPlanSchema, parseCoachingPlan } from '@/lib/coaching-plan-schema'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const SavePlanSchema = z.object({
  clientId: z.string().uuid(),
  plan: CoachingPlanSchema,
  planningInputs: z.record(z.string(), z.string()).optional(),
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

  const { clientId, plan, planningInputs } = parsed.data
  const supabase = await createAdminClient()

  const { data: savedPlan, error } = await supabase
    .from('coaching_plans')
    .upsert(
      {
        coaching_client_id: clientId,
        macro_targets: plan.macroTargets,
        meal_plan: plan.mealPlan,
        recipes: plan.recipes,
        grocery_list: plan.groceryList,
        planning_inputs: planningInputs ?? {},
        admin_notes: plan.adminNotes,
        client_notes: plan.clientNotes,
        status: plan.status,
        generated_by_ai: plan.generatedByAi,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'coaching_client_id' }
    )
    .select('macro_targets, meal_plan, recipes, grocery_list, planning_inputs, admin_notes, client_notes, status, generated_by_ai')
    .single()

  if (error) {
    console.error('[coaching plan save] failed:', error.message)
    if (error.message.includes('planning_inputs')) {
      return NextResponse.json({
        error: 'The coaching plan database needs the v7 planning_inputs migration before these edits can save.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (plan.status === 'published') {
    await supabase
      .from('coaching_clients')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', clientId)
  }

  return NextResponse.json({
    success: true,
    plan: parseCoachingPlan({
      macroTargets: savedPlan?.macro_targets,
      mealPlan: savedPlan?.meal_plan,
      recipes: savedPlan?.recipes,
      groceryList: savedPlan?.grocery_list,
      adminNotes: savedPlan?.admin_notes ?? '',
      clientNotes: savedPlan?.client_notes ?? '',
      status: savedPlan?.status,
      generatedByAi: savedPlan?.generated_by_ai,
    }),
    planningInputs: savedPlan?.planning_inputs ?? {},
  })
}
