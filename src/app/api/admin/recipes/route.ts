import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'
import { getUsdaApiKey } from '@/lib/usda/api-key'
import { resyncPlansForRecipes } from '@/lib/plan-resync'

const RecipeSchema = z.object({
  name: z.string().min(1),
  meal_type: z.string().default('dinner'),
  family_servings: z.string().default('4'),
  ingredients: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  notes: z.string().default(''),
  calories: z.number().nullable().optional(),
  protein: z.number().nullable().optional(),
  carbs: z.number().nullable().optional(),
  fats: z.number().nullable().optional(),
  fiber: z.number().nullable().optional(),
  total_recipe_grams: z.number().nullable().optional(),
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
    .from('recipe_library')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recipes: data ?? [] })
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

  const parsed = RecipeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid recipe data.' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('recipe_library')
    .insert({ ...parsed.data, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // A new library recipe can adopt plan cards that carried its name before
  // it existed (cards flagged "not in your library") — link them right away.
  const usdaKey = getUsdaApiKey()
  const resync = usdaKey.source === 'DEMO_KEY'
    ? undefined
    : await resyncPlansForRecipes({ supabase, apiKey: usdaKey.key, recipeNames: [data.name] })
  if (resync?.failed.length) {
    console.error('[plan resync] failures:', JSON.stringify(resync.failed))
  }

  return NextResponse.json({ recipe: data, resync })
}
