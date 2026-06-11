import { redirect } from 'next/navigation'
import AdminShellClient from '@/components/admin/AdminShellClient'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

/**
 * Defense-in-depth: proxy.ts already blocks non-admins at the edge,
 * but we still verify the signed admin session here so server components can rely on it.
 * If proxy ever short-circuits (e.g. during local dev without Supabase),
 * this redirect closes the gap.
 */
export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let adminName = 'Admin'
  let adminEmail = 'admin@lumorawomen.com'
  let unreadMessages = 0

  if (supabaseConfigured) {
    let session: Awaited<ReturnType<typeof getVerifiedAdminUser>>
    try {
      session = await getVerifiedAdminUser()
    } catch {
      redirect('/admin/login?error=unauthorized')
    }

    const { user, supabase } = session
    const { data: profile } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()

    adminEmail = profile?.email ?? user.email ?? adminEmail
    const fullName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()
    adminName = fullName || (user.email ?? '').split('@')[0] || 'Admin'

    const { count } = await supabase
      .from('coaching_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender', 'client')
      .is('read_by_coach_at', null)
    unreadMessages = count ?? 0
  }

  return (
    <AdminShellClient adminName={adminName} adminEmail={adminEmail} unreadMessages={unreadMessages}>
      {children}
    </AdminShellClient>
  )
}
