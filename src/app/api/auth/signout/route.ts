import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/request-security'

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  )
}
