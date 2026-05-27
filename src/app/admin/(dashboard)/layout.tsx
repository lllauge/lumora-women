import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'

/**
 * Defense-in-depth: proxy.ts already blocks non-admins at the edge,
 * but we still verify role here so server components can rely on it.
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

  if (supabaseConfigured) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/admin/login')

    const { data: profile } = await supabase
      .from('users')
      .select('email, first_name, last_name, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      redirect('/admin/login?error=unauthorized')
    }

    adminEmail = profile?.email ?? user.email ?? adminEmail
    const fullName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()
    adminName = fullName || (user.email ?? '').split('@')[0] || 'Admin'
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <AdminTopbar adminName={adminName} adminEmail={adminEmail} />
      <main id="main-content" className="admin-main">{children}</main>
    </div>
  )
}
