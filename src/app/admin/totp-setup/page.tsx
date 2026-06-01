import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import TotpSetupClient from '@/components/admin/TotpSetupClient'
import { generateTotpSecret, generateQrCode } from '@/lib/totp'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

export const metadata: Metadata = {
  title: 'Set Up Two-Factor Authentication',
  robots: { index: false, follow: false },
}

export default async function TotpSetupPage() {
  let session: Awaited<ReturnType<typeof getVerifiedAdminUser>>
  try {
    session = await getVerifiedAdminUser()
  } catch {
    redirect('/admin/login?error=unauthorized')
  }

  // Generate new TOTP secret for this admin
  const { base32, otpauthUrl } = generateTotpSecret()
  const qrCodeDataUrl = await generateQrCode(otpauthUrl)

  return (
    <TotpSetupClient
      secret={base32}
      qrCodeDataUrl={qrCodeDataUrl}
      userId={session.user.id}
    />
  )
}
