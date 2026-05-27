import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TotpSetupClient from '@/components/admin/TotpSetupClient'
import { generateTotpSecret, generateQrCode } from '@/lib/totp'

export const metadata: Metadata = {
  title: 'Set Up Two-Factor Authentication',
  robots: { index: false, follow: false },
}

export default async function TotpSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') redirect('/admin/login?error=unauthorized')

  // Generate new TOTP secret for this admin
  const { base32, otpauthUrl } = generateTotpSecret()
  const qrCodeDataUrl = await generateQrCode(otpauthUrl)

  return (
    <TotpSetupClient
      secret={base32}
      qrCodeDataUrl={qrCodeDataUrl}
      userId={user.id}
    />
  )
}
