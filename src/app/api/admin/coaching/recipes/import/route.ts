import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { importRecipeFromUrl } from '@/lib/recipes/url-importer'
import { requireSameOrigin } from '@/lib/request-security'
import { getUsdaApiKey } from '@/lib/usda/api-key'

const ImportRequestSchema = z.object({
  url: z.string().trim().url('Enter a recipe URL.').max(2048),
})

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
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = ImportRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid URL.' }, { status: 400 })
  }

  try {
    const recipe = await importRecipeFromUrl(parsed.data.url, openAiKey, getUsdaApiKey().key)
    return NextResponse.json({ recipe })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not import that recipe.'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
