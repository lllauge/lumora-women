import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'
import { getUsdaApiKey } from '@/lib/usda/api-key'
import { resyncPlansForRecipes } from '@/lib/plan-resync'

const RecipeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  meal_type: z.string().optional(),
  family_servings: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  calories: z.number().nullable().optional(),
  protein: z.number().nullable().optional(),
  carbs: z.number().nullable().optional(),
  fats: z.number().nullable().optional(),
  fiber: z.number().nullable().optional(),
  total_recipe_grams: z.number().nullable().optional(),
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

  const parsed = RecipeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid recipe data.' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // The pre-update name matters for the plan resync below: plan cards match
  // the library by name, so a renamed recipe must resync plans that still
  // reference the old name too.
  const { data: before } = await supabase
    .from('recipe_library')
    .select('name')
    .eq('id', id)
    .maybeSingle()

  // Stored macro totals (paste-mode / URL imports) describe the ingredient
  // list they were entered with. If the ingredients change and the totals
  // were not deliberately updated in the same save, clear them — otherwise
  // every client plan using this recipe keeps scaling the stale numbers.
  // Cleared macros simply route the recipe through the USDA calculation.
  const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (parsed.data.ingredients) {
    const { data: existing, error: existingError } = await supabase
      .from('recipe_library')
      .select('ingredients, calories, protein, carbs, fats, fiber, total_recipe_grams')
      .eq('id', id)
      .single()
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const previous = (existing.ingredients ?? []) as string[]
    const next = parsed.data.ingredients
    const ingredientsChanged = previous.length !== next.length
      || previous.some((line, index) => line.trim() !== next[index]?.trim())
    const macrosUntouched = (parsed.data.calories ?? null) === (existing.calories ?? null)
      && (parsed.data.protein ?? null) === (existing.protein ?? null)
      && (parsed.data.carbs ?? null) === (existing.carbs ?? null)
      && (parsed.data.fats ?? null) === (existing.fats ?? null)

    if (ingredientsChanged && existing.calories != null && macrosUntouched) {
      update.calories = null
      update.protein = null
      update.carbs = null
      update.fats = null
      update.fiber = null
      update.total_recipe_grams = null
    }
  }

  const { data, error } = await supabase
    .from('recipe_library')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Push the change into every client plan that uses this recipe, so plans
  // never serve stale snapshots. A resync problem never fails the recipe
  // save — the summary tells the admin UI what happened.
  const usdaKey = getUsdaApiKey()
  const resync = usdaKey.source === 'DEMO_KEY'
    ? undefined
    : await resyncPlansForRecipes({
      supabase,
      apiKey: usdaKey.key,
      recipeNames: [before?.name, data.name].filter((name): name is string => Boolean(name)),
    })
  if (resync?.failed.length) {
    console.error('[plan resync] failures:', JSON.stringify(resync.failed))
  }

  return NextResponse.json({ recipe: data, resync })
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
    .from('recipe_library')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
