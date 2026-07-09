import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Eye } from 'lucide-react'
import ClientPlanView from '@/components/coaching/ClientPlanView'
import { getClientPortalPreview } from '@/lib/coaching-engagement'

export const metadata: Metadata = {
  title: 'Client Portal Preview | Lumora Women Admin',
}

// Read-only "view as client": renders the client's My Plan tab with her live
// published data, so Laura never has to ask a client for screenshots. Sits
// behind the admin dashboard layout (role + TOTP guard).
export default async function AdminClientPortalPreviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const preview = await getClientPortalPreview(clientId)
  if (!preview) notFound()

  const name = [preview.client.first_name, preview.client.last_name].filter(Boolean).join(' ').trim() || 'this client'
  const firstName = preview.client.first_name?.trim() || 'she'

  return (
    <div>
      <Link
        href={`/admin/coaching/${clientId}`}
        className="inline-flex items-center gap-2 mb-4"
        style={{
          fontFamily: 'var(--font-hanken)',
          color: 'var(--admin-on-surface-variant)',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={16} />
        Back to {name}
      </Link>

      <div
        role="status"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          background: 'var(--section-sand)', border: '1px solid #D7A91E', borderRadius: '0.75rem',
          padding: '0.75rem 1rem', marginBottom: '1.25rem',
          fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', color: '#382D0A',
        }}
      >
        <Eye size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span>
          <strong>Viewing as {name}.</strong> This is her live My Plan tab, exactly as it renders
          for her — read-only, she can&apos;t tell you&apos;re looking.
        </span>
      </div>

      {preview.plan ? (
        <div
          style={{
            background: 'var(--page-bg)',
            borderRadius: '1rem',
            border: '1px solid rgba(200,220,192,0.5)',
            padding: '1.5rem 1.25rem',
            maxWidth: '46rem',
          }}
        >
          <ClientPlanView
            client={{ id: preview.client.id }}
            plan={preview.plan}
            individualPlanStyle={preview.individualPlanStyle}
            mealPlanStartDate={preview.mealPlanStartDate}
            previewMode
          />
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--font-hanken)', color: 'var(--admin-on-surface-variant)' }}>
          No published plan yet — once {firstName} has one, her portal renders here.
        </p>
      )}
    </div>
  )
}
