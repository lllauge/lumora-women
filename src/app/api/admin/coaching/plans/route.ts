import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { CoachingPlanSchema, parseCoachingPlan } from '@/lib/coaching-plan-schema'
import { validatePlan, summarizeValidation } from '@/lib/recipe-validator'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'
import {
  normalizeReferencedPlanNutrition,
  NutritionNormalizationError,
} from '@/lib/normalize-plan-nutrition'
import { getUsdaApiKey } from '@/lib/usda/api-key'
import { sendPlanPublishedEmail } from '@/lib/coaching-email'

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

  const { clientId, planningInputs } = parsed.data
  let plan = parsed.data.plan
  const supabase = await createAdminClient()

  const { data: libraryRecipes, error: libraryError } = await supabase
    .from('recipe_library')
    .select('name, ingredients, calories, protein, carbs, fats, fiber')

  if (libraryError) {
    return NextResponse.json({ error: 'Could not verify recipe nutrition before saving.' }, { status: 500 })
  }

  const usdaKey = getUsdaApiKey()
  if (usdaKey.source === 'DEMO_KEY') {
    return NextResponse.json({
      error: 'Nutrition verification is unavailable, so this plan was not saved. Configure USDA_FDC_API_KEY and try again.',
    }, { status: 503 })
  }

  try {
    plan = await normalizeReferencedPlanNutrition({
      plan,
      mealPlanStyle: planningInputs?.mealPlanStyle,
      libraryRecipes: libraryRecipes ?? [],
      apiKey: usdaKey.key,
    })
  } catch (error) {
    const message = error instanceof NutritionNormalizationError
      ? error.message
      : 'Nutrition verification failed unexpectedly.'
    return NextResponse.json({
      error: `Plan not saved because its nutrition could not be verified: ${message}`,
    }, { status: 422 })
  }

  // Block incomplete recipes. A calorie-vs-4/4/9 difference alone is only a
  // review warning because USDA-specific Atwater factors, fiber, and label
  // rounding can legitimately produce different totals.
  if (plan.status === 'published') {
    const validation = validatePlan(plan)
    if (!validation.ok) {
      return NextResponse.json({
        error: `Can't publish: one or more recipes have macro problems. Fix these first, then publish:\n\n${summarizeValidation(validation)}`,
        validation,
      }, { status: 422 })
    }
  }

  // The upsert overwrites the stored status, so capture it first: the "plan
  // ready" email must fire only on the draft→published transition, never on
  // routine re-saves of an already-published plan.
  const { data: existingPlan } = await supabase
    .from('coaching_plans')
    .select('status')
    .eq('coaching_client_id', clientId)
    .maybeSingle()
  const justPublished = plan.status === 'published' && existingPlan?.status !== 'published'

  const { data: savedPlan, error } = await supabase
    .from('coaching_plans')
    .upsert(
      {
        coaching_client_id: clientId,
        macro_targets: plan.macroTargets,
        meal_plan: plan.mealPlan,
        recipes: plan.recipes,
        workout_plan: plan.workoutPlan,
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
    .select('macro_targets, meal_plan, recipes, workout_plan, grocery_list, planning_inputs, admin_notes, client_notes, status, generated_by_ai')
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

  // Tell the client her plan is live. Email failure never fails the save —
  // the plan IS published; the notice tells Laura to follow up manually.
  let notice: string | undefined
  if (justPublished) {
    const { data: clientRow } = await supabase
      .from('coaching_clients')
      .select('email, first_name')
      .eq('id', clientId)
      .maybeSingle()
    const clientLabel = clientRow?.first_name?.trim() || 'The client'
    if (!clientRow?.email) {
      notice = `No email is on file for this client, so no "plan ready" email was sent.`
    } else {
      const emailResult = await sendPlanPublishedEmail({
        to: clientRow.email,
        firstName: clientRow.first_name ?? undefined,
      })
      notice = emailResult.ok
        ? `${clientLabel} was emailed that her plan is ready.`
        : `The "plan ready" email to ${clientRow.email} failed (${emailResult.error}) — let her know another way.`
      if (!emailResult.ok) {
        console.error('[plan published email] failed:', emailResult.error)
      }
    }
  }

  return NextResponse.json({
    success: true,
    notice,
    plan: parseCoachingPlan({
      macroTargets: savedPlan?.macro_targets,
      mealPlan: savedPlan?.meal_plan,
      recipes: savedPlan?.recipes,
      workoutPlan: savedPlan?.workout_plan,
      groceryList: savedPlan?.grocery_list,
      adminNotes: savedPlan?.admin_notes ?? '',
      clientNotes: savedPlan?.client_notes ?? '',
      status: savedPlan?.status,
      generatedByAi: savedPlan?.generated_by_ai,
    }),
    planningInputs: savedPlan?.planning_inputs ?? {},
  })
}
