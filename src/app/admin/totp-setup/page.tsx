import { redirect } from 'next/navigation'

export default function LegacyTotpSetupPage() {
  redirect('/mfa?area=admin&mode=enroll&redirectTo=/admin')
}
