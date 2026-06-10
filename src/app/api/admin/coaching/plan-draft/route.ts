import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import {
  CoachingPlanAiJsonSchema,
  CoachingPlanSchema,
  type CoachingPlanDraft,
} from '@/lib/coaching-plan-schema'
import { calculateMacroTargets } from '@/lib/coaching-macro-calculator'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'
import { getUsdaApiKey } from '@/lib/usda/api-key'
import { calculateRecipeNutritionFromUsda } from '@/lib/usda/food-data'

const LibraryRecipeSchema = z.object({
  name: z.string(),
  meal_type: z.string(),
  family_servings: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  notes: z.string(),
})

const DraftRequestSchema = z.object({
  clientId: z.string().uuid(),
  planningInputs: z.record(z.string(), z.string()).optional(),
  libraryRecipes: z.array(LibraryRecipeSchema).optional(),
})

function extractOutputText(response: unknown) {
  const output = (response as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }).output
  return output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text' && typeof content.text === 'string')
    ?.text
}

function openAiErrorMessage(errorText: string) {
  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string; type?: string; code?: string } }
    const message = parsed.error?.message
    const code = parsed.error?.code || parsed.error?.type
    return [message, code ? `(${code})` : ''].filter(Boolean).join(' ')
  } catch {
    return errorText.slice(0, 400)
  }
}

function firstNumber(value: string | undefined) {
  const match = String(value ?? '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

// Same defaults as the plan editor so draft numbers don't shift on save.
function mealCalorieTarget(mealType: string, dailyCalories: number, planningInputs: Record<string, string>) {
  const pct = (key: string, fallback: number) => (firstNumber(planningInputs[key]) || fallback) / 100
  const type = mealType.toLowerCase()
  if (type.includes('breakfast')) return dailyCalories * pct('breakfastPct', 35)
  if (type.includes('lunch')) return dailyCalories * pct('lunchPct', 30)
  if (type.includes('dinner')) return dailyCalories * pct('dinnerPct', 25)
  if (type.includes('snack')) return dailyCalories * pct('snackPct', 10)
  return dailyCalories * pct('lunchPct', 30)
}

function recipeMacroLabel(recipe: CoachingPlanDraft['recipes'][number]) {
  return [
    recipe.calories ? `${recipe.calories} cal` : '',
    recipe.protein ? `${recipe.protein} protein` : '',
    recipe.carbs ? `${recipe.carbs} carbs` : '',
    recipe.fats ? `${recipe.fats} fats` : '',
  ].filter(Boolean).join(', ')
}

async function addUsdaServingMathToDraft(plan: CoachingPlanDraft, planningInputs: Record<string, string>) {
  const apiKey = getUsdaApiKey()
  if (apiKey.source === 'DEMO_KEY') {
    return plan
  }

  const dailyCalories = firstNumber(plan.macroTargets.calories)
  if (!dailyCalories) return plan

  const individualPlanStyle = planningInputs.mealPlanStyle === 'individual_only'

  const recipes = await Promise.all(plan.recipes.map(async (recipe) => {
    if (recipe.ingredients.length === 0) return recipe

    // Family recipes (serves >1) get the client's portion carved out to her meal
    // calorie target; individual recipes are eaten exactly as written.
    const familyCount = firstNumber(recipe.familyServings || recipe.servings)
    const isFamily = !individualPlanStyle && familyCount > 1

    try {
      const nutrition = await calculateRecipeNutritionFromUsda({
        ingredients: recipe.ingredients,
        clientServingMultiplier: recipe.clientServingMultiplier || (isFamily ? undefined : '1'),
        targetCalories: isFamily ? mealCalorieTarget(recipe.mealType, dailyCalories, planningInputs) : undefined,
        familyServings: recipe.familyServings || recipe.servings,
        apiKey: apiKey.key,
      })

      if (!nutrition.totalRecipe.calories) return recipe

      const sourceNote = [
        `USDA auto-scaled client serving for ${recipe.mealType || 'this meal'}.`,
        `Client portion: ${nutrition.clientServingGrams}g. ${nutrition.clientServingMeasure}`,
        nutrition.clientServingBreakdown ? `Ingredient breakdown: ${nutrition.clientServingBreakdown}.` : '',
        `Client serving share: ${nutrition.clientServingMultiplier.toFixed(2)} of the full recipe.`,
        `Full recipe USDA total: ${nutrition.totalRecipe.calories} cal, ${nutrition.totalRecipe.protein}g protein, ${nutrition.totalRecipe.carbs}g carbs, ${nutrition.totalRecipe.fats}g fats.`,
        nutrition.warnings.length ? `Review USDA warnings: ${nutrition.warnings.join(' ')}` : '',
      ].filter(Boolean).join(' ')

      return {
        ...recipe,
        clientServingMultiplier: nutrition.clientServingMultiplier.toFixed(2),
        clientServingGrams: `${nutrition.clientServingGrams}g`,
        clientServingMeasure: nutrition.clientServingMeasure,
        clientServingBreakdown: nutrition.clientServingBreakdown,
        clientServing: nutrition.clientServingBreakdown || `${nutrition.clientServingGrams}g`,
        calories: `${nutrition.clientServing.calories}`,
        protein: `${nutrition.clientServing.protein}g`,
        carbs: `${nutrition.clientServing.carbs}g`,
        fats: `${nutrition.clientServing.fats}g`,
        notes: [recipe.notes, sourceNote].filter(Boolean).join('\n\n'),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'USDA macro calculation failed.'
      return {
        ...recipe,
        notes: [recipe.notes, `USDA auto-scaling skipped: ${message} App used ${apiKey.source} (${apiKey.fingerprint}).`].filter(Boolean).join('\n\n'),
      }
    }
  }))

  const mealPlan = plan.mealPlan.map((day) => {
    const updateMeal = (meal: CoachingPlanDraft['mealPlan'][number]['breakfast']) => {
      const recipe = recipes.find((item) => item.name && item.name === meal.recipeName)
      return recipe ? { ...meal, macros: recipeMacroLabel(recipe) } : meal
    }

    return {
      ...day,
      breakfast: updateMeal(day.breakfast),
      lunch: updateMeal(day.lunch),
      dinner: updateMeal(day.dinner),
      snacks: day.snacks.map(updateMeal),
    }
  })

  return { ...plan, recipes, mealPlan }
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  try {
    await getVerifiedAdminUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const openAiKey = process.env.OPENAI_API_KEY
  if (!openAiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in Vercel.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = DraftRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid client id.' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data: client } = await supabase
    .from('coaching_clients')
    .select('id, email, first_name, last_name')
    .eq('id', parsed.data.clientId)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }

  const { data: onboarding } = await supabase
    .from('coaching_onboarding')
    .select('form_data')
    .eq('coaching_client_id', client.id)
    .maybeSingle()

  if (!onboarding?.form_data) {
    return NextResponse.json({ error: 'This client has not submitted onboarding yet.' }, { status: 400 })
  }

  const calculatedMacros = parsed.data.planningInputs
    ? calculateMacroTargets({
        age: parsed.data.planningInputs.age ?? '',
        height: parsed.data.planningInputs.height ?? '',
        weight: parsed.data.planningInputs.weight ?? '',
        targetWeight: parsed.data.planningInputs.targetWeight ?? '',
        primaryGoal: parsed.data.planningInputs.primaryGoal ?? '',
        planGoal: parsed.data.planningInputs.planGoal ?? 'recomposition',
        mealPlanStyle: parsed.data.planningInputs.mealPlanStyle ?? 'family_dinners',
        activityLevel: parsed.data.planningInputs.activityLevel ?? 'light_daily_movement',
        steps: parsed.data.planningInputs.steps ?? '',
        strengthTraining: parsed.data.planningInputs.strengthTraining ?? 'not_sure',
        strengthTrainingDetails: parsed.data.planningInputs.strengthTrainingDetails ?? '',
        workouts: parsed.data.planningInputs.workouts ?? '',
        water: parsed.data.planningInputs.water ?? '',
        medicalConditions: parsed.data.planningInputs.medicalConditions ?? '',
        medications: parsed.data.planningInputs.medications ?? '',
        injuries: parsed.data.planningInputs.injuries ?? '',
        currentEating: parsed.data.planningInputs.currentEating ?? '',
        allergies: parsed.data.planningInputs.allergies ?? '',
        restrictions: parsed.data.planningInputs.restrictions ?? '',
        favoriteFoods: parsed.data.planningInputs.favoriteFoods ?? '',
        dislikedFoods: parsed.data.planningInputs.dislikedFoods ?? '',
        eatingOut: parsed.data.planningInputs.eatingOut ?? '',
        sleep: parsed.data.planningInputs.sleep ?? '',
        stress: parsed.data.planningInputs.stress ?? '',
        breakfastPct: parsed.data.planningInputs.breakfastPct ?? '35',
        lunchPct: parsed.data.planningInputs.lunchPct ?? '30',
        dinnerPct: parsed.data.planningInputs.dinnerPct ?? '25',
        snackPct: parsed.data.planningInputs.snackPct ?? '10',
      })
    : null

  const libraryRecipes = parsed.data.libraryRecipes ?? []
  const hasLibrary = libraryRecipes.length > 0

  const libraryInstructions = hasLibrary ? [
    `Laura has a recipe library with ${libraryRecipes.length} recipes. You MUST use only recipes from this library — do not invent new ones.`,
    'Select the best recipes from the library for each meal slot based on the client\'s allergies, food preferences, disliked foods, and macro targets.',
    'For each recipe you select, copy its name, ingredients, instructions, and notes exactly as provided — do not modify them.',
    'Set familyServings from the library recipe\'s family_servings field.',
    'If a recipe in the library has no ingredients, still use it — USDA post-processing will be skipped for that recipe.',
    'Fill all 3 days of the meal plan. Vary the recipes across days so the client is not eating the same thing every day.',
    'If the library does not have enough recipes for a meal type (e.g. no breakfast recipes), leave that slot empty rather than inventing a recipe.',
  ] : [
    'No recipe library was provided. Generate practical draft recipes from the client onboarding data and macro targets. Laura must review them before publishing.',
    'For every recipe, write ingredient lines with measurable weights whenever practical, such as "150g cooked chicken breast", "200g cooked rice", "2 oz cheddar cheese", or "100g avocado". Avoid vague amounts like "1 bowl" or "to taste".',
  ]

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      instructions: [
        'You are assisting Laura from Lumora Women with drafting a 1:1 coaching macro and meal plan.',
        'Create a practical, non-clinical, non-medical draft that Laura will manually review before sending to the client.',
        'Do not claim to diagnose, treat, prescribe, manage, heal, reverse, or replace medical care.',
        'Never tell the client they have PCOS, insulin resistance, hormonal dysfunction, thyroid disease, diabetes, or any other condition. Only reference medical context if the client self-reported it, and keep that context in adminNotes as something Laura may want to review or refer out for.',
        'Use the client onboarding data only. If information is missing, make conservative assumptions and mention what Laura should verify in adminNotes.',
        'If adminCorrectedPlanningInputs or calculatedMacroStartingPoint are provided, treat them as higher priority than the original onboarding fields.',
        'Keep macro targets close to calculatedMacroStartingPoint unless the onboarding data clearly requires Laura to review a different approach.',
        'Use the admin-selected planGoal. Recomposition should be near maintenance with a small deficit, not an aggressive cut.',
        ...libraryInstructions,
        'If mealPlanStyle is family_dinners, dinners are full family recipes. Set familyServings to the total family yield. Leave clientServingMultiplier and clientServingBreakdown blank — USDA post-processing will calculate them.',
        'If mealPlanStyle is individual_only, set familyServings to "not applicable", clientServing to the full individual serving, and clientServingMultiplier to "1".',
        'Do not add fields outside the schema.',
        'When a meal in mealPlan uses a recipe, set recipeName exactly equal to that recipe\'s name so USDA-calculated macros flow back into the meal.',
        'Default to high-protein, high-fiber meals with moderate healthy fats and mostly minimally processed carbohydrates.',
        'Return only valid structured JSON matching the schema.',
      ].join('\n'),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                client: {
                  firstName: client.first_name,
                  lastName: client.last_name,
                  email: client.email,
                },
                onboarding: onboarding.form_data,
                adminCorrectedPlanningInputs: parsed.data.planningInputs ?? null,
                calculatedMacroStartingPoint: calculatedMacros,
                recipeLibrary: hasLibrary ? libraryRecipes.map(r => ({
                  name: r.name,
                  mealType: r.meal_type,
                  familyServings: r.family_servings,
                  ingredients: r.ingredients,
                  instructions: r.instructions,
                  notes: r.notes,
                })) : undefined,
                request: hasLibrary
                  ? 'Draft macro targets and a full 7-day meal plan (Day 1 through Day 7) using only the recipes from recipeLibrary. Each day must have breakfast, lunch, dinner, and optionally a snack. Rotate recipes across days so the client is not eating the same meal every day — aim for variety while staying within the library. Build a consolidated grocery list from all selected recipes. Add admin review notes and client-facing notes.'
                  : 'Draft macro targets, a full 7-day meal plan (Day 1 through Day 7), at least 10 recipes with cooking instructions, a grocery list, admin review notes, and client-facing notes. Each day must have breakfast, lunch, dinner, and a snack. For family_dinners, dinners must include a full family recipe. USDA post-processing will calculate the client serving size and client-serving macros.',
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'coaching_plan_draft',
          strict: true,
          schema: CoachingPlanAiJsonSchema,
        },
      },
      max_output_tokens: 9000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[coaching plan ai] OpenAI error:', errorText)
    return NextResponse.json({ error: `AI draft failed: ${openAiErrorMessage(errorText)}` }, { status: 502 })
  }

  const data = await response.json()
  const text = extractOutputText(data)
  if (!text) {
    return NextResponse.json({ error: 'AI draft returned no text.' }, { status: 502 })
  }

  let draft: unknown
  try {
    draft = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'AI draft returned invalid JSON.' }, { status: 502 })
  }

  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return NextResponse.json({ error: 'AI draft returned an invalid shape.' }, { status: 502 })
  }

  const plan = CoachingPlanSchema.safeParse({ ...draft, generatedByAi: true, status: 'draft' })
  if (!plan.success) {
    console.error('[coaching plan ai] schema mismatch:', plan.error.issues)
    const issues = plan.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'draft'}: ${issue.message}`)
      .join('; ')
    return NextResponse.json({ error: `AI draft did not match the plan format: ${issues}` }, { status: 502 })
  }

  const planWithUsdaServingMath = await addUsdaServingMathToDraft(plan.data, parsed.data.planningInputs ?? {})

  return NextResponse.json({ plan: planWithUsdaServingMath })
}
