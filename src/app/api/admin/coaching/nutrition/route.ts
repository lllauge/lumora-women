import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { calculateRecipeNutritionFromUsda } from '@/lib/usda/food-data'

const NutritionRequestSchema = z.object({
  ingredients: z.array(z.string().trim().min(1)).min(1).max(40),
  clientServingMultiplier: z.string().trim().max(20).optional(),
  targetCalories: z.number().positive().optional(),
  familyServings: z.string().trim().max(120).optional(),
})

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const apiKey = process.env.USDA_FDC_API_KEY || process.env.USDA_API_KEY || 'DEMO_KEY'

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = NutritionRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Add recipe ingredients with amounts before calculating USDA macros.',
    }, { status: 400 })
  }

  try {
    const nutrition = await calculateRecipeNutritionFromUsda({
      ingredients: parsed.data.ingredients,
      clientServingMultiplier: parsed.data.clientServingMultiplier,
      targetCalories: parsed.data.targetCalories,
      familyServings: parsed.data.familyServings,
      apiKey,
    })

    if (nutrition.ingredients.length === 0) {
      return NextResponse.json({
        error: 'USDA could not calculate this recipe. Use ingredient lines like "150g cooked chicken breast" or "2 oz cheddar cheese".',
        nutrition,
      }, { status: 422 })
    }

    return NextResponse.json({ nutrition })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'USDA nutrition calculation failed.'
    console.error('[usda nutrition] failed:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
