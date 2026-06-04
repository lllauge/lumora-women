import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import CoachingCheckoutForm from '@/components/admin/CoachingCheckoutForm'
import { formatCurrency, formatShortDate } from '@/utils/format'

export const metadata: Metadata = {
  title: 'Coaching Clients',
  robots: { index: false, follow: false },
}

type CoachingClient = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  onboarding_status: string
  paid_at: string | null
  coaching_orders: { amount: number | string | null } | null
}

async function loadClients() {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('coaching_clients')
    .select(`
      id, email, first_name, last_name, status, onboarding_status, paid_at,
      coaching_orders(amount)
    `)
    .order('created_at', { ascending: false })

  return (data ?? []) as unknown as CoachingClient[]
}

function statusLabel(value: string) {
  return value.replace(/_/g, ' ')
}

export default async function AdminCoachingPage() {
  const clients = await loadClients()

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '2rem', fontWeight: 600, color: 'var(--admin-on-surface)' }}>
          Coaching
        </h1>
        <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
          Create paid 1:1 coaching checkout links and review clients after payment.
        </p>
      </div>

      <CoachingCheckoutForm />

      <div className="admin-card overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--admin-outline-variant)' }}>
          <h2 style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1.375rem', fontWeight: 600, color: 'var(--admin-on-surface)' }}>
            Paid Coaching Clients
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Status</th>
                <th>Onboarding</th>
                <th>Paid</th>
                <th>Amount</th>
                <th className="text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16" style={{ color: 'var(--admin-on-surface-variant)' }}>
                    No paid coaching clients yet.
                  </td>
                </tr>
              ) : clients.map((client) => {
                const name = [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || 'Client'
                return (
                  <tr key={client.id}>
                    <td style={{ fontWeight: 700 }}>{name}</td>
                    <td>{client.email}</td>
                    <td><span className="admin-pill admin-pill-success">{statusLabel(client.status)}</span></td>
                    <td>{statusLabel(client.onboarding_status)}</td>
                    <td>{client.paid_at ? formatShortDate(client.paid_at) : '—'}</td>
                    <td>{formatCurrency(Number(client.coaching_orders?.amount ?? 0))}</td>
                    <td className="text-right">
                      <Link href={`/admin/coaching/${client.id}`} className="admin-btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
                        View Onboarding
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
