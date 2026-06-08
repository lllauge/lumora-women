import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import { requireSameOrigin } from '@/lib/request-security'
import { createAdminClient } from '@/lib/supabase/server'

const ProgressSchema = z.object({
  clientId: z.string().uuid(),
  loggedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  weight: z.string().trim().max(40).optional(),
  bodyFat: z.string().trim().max(40).optional(),
  waist: z.string().trim().max(40).optional(),
  hips: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
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

  const parsed = ProgressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the progress log fields and try again.' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { clientId, loggedAt, weight, bodyFat, waist, hips, notes } = parsed.data

  const { data: client, error: clientError } = await supabase
    .from('coaching_clients')
    .select('id, user_id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 })
  }

  if (!client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }

  const { data: log, error } = await supabase
    .from('coaching_progress_logs')
    .insert({
      coaching_client_id: client.id,
      user_id: client.user_id,
      logged_at: loggedAt || new Date().toISOString().slice(0, 10),
      weight: weight || null,
      body_fat: bodyFat || null,
      waist: waist || null,
      hips: hips || null,
      notes: notes || null,
    })
    .select('id, logged_at, weight, body_fat, waist, hips, notes')
    .single()

  if (error) {
    console.error('[coaching progress save] failed:', error.message)
    if (error.message.includes('coaching_progress_logs')) {
      return NextResponse.json({
        error: 'The coaching progress database needs the v7 progress migration before logs can save.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ log })
}
