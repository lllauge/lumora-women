import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import {
  CoachingPlanAiJsonSchema,
  CoachingPlanSchema,
} from '@/lib/coaching-plan-schema'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const DraftRequestSchema = z.object({
  clientId: z.string().uuid(),
})

function extractOutputText(response: unknown) {
  const output = (response as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }).output
  return output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text' && typeof content.text === 'string')
    ?.text
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
        'Do not claim to diagnose, treat, prescribe, or replace medical care.',
        'Use the client onboarding data only. If information is missing, make conservative assumptions and mention what Laura should verify in adminNotes.',
        'Use simple meals, realistic prep, high-protein options, and flexible swaps.',
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
                request: 'Draft macro targets, a 3-day meal plan, 6-8 recipes with cooking instructions, a grocery list, admin review notes, and client-facing notes.',
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
      max_output_tokens: 6000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[coaching plan ai] OpenAI error:', errorText)
    return NextResponse.json({ error: 'AI draft failed. Please try again.' }, { status: 502 })
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
    return NextResponse.json({ error: 'AI draft did not match the plan format.' }, { status: 502 })
  }

  return NextResponse.json({ plan: plan.data })
}
