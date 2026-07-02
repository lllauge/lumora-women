import { redirect } from 'next/navigation'

export default function LegacyTotpVerificationPage() {
  redirect('/mfa?area=admin&mode=challenge&redirectTo=/admin')
}
