'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState, useTransition } from 'react'
import {
  CalendarDays, CreditCard, Hash, Loader2, Printer,
  Receipt, RefreshCw, ShieldAlert, X,
} from 'lucide-react'
import { getOrderDetail, type OrderDetail } from '@/app/actions/admin-orders'
import {
  avatarPaletteIndex,
  formatCurrency,
  formatShortDate,
  getInitials,
} from '@/utils/format'

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--admin-sage-fixed)',   fg: 'var(--admin-on-sage-container)' },
  { bg: 'var(--admin-rose-fixed)',   fg: 'var(--admin-on-rose-fixed)' },
  { bg: 'var(--admin-celadon-pale)', fg: 'var(--admin-primary-container)' },
  { bg: 'var(--admin-sand-fixed)',   fg: 'var(--admin-on-sand-fixed)' },
]

export default function OrderDrawer({
  trigger,
  orderId,
  initialStatus,
}: {
  trigger: React.ReactNode
  orderId: string
  initialStatus: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && !detail) {
      setError(null)
      startTransition(async () => {
        const result = await getOrderDetail(orderId)
        if (result.ok) setDetail(result.detail)
        else setError(result.error)
      })
    }
  }

  const statusToShow = detail?.status ?? initialStatus

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[60] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          style={{ background: 'rgba(27, 28, 25, 0.35)', backdropFilter: 'blur(2px)' }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-[70] h-screen w-full max-w-md flex flex-col data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-200"
          style={{
            background: 'var(--admin-bg)',
            boxShadow: '-20px 0 60px -20px rgba(21, 51, 40, 0.18)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--admin-outline-variant)' }}
          >
            <div>
              <Dialog.Title asChild>
                <h3
                  style={{
                    fontFamily: 'var(--font-eb-garamond)',
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    color: 'var(--admin-on-surface)',
                    margin: 0,
                  }}
                >
                  Order Details
                </h3>
              </Dialog.Title>
              <p
                className="mt-0.5"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.75rem',
                  color: 'var(--admin-on-surface-variant)',
                  margin: 0,
                }}
              >
                Status: <StatusInline status={statusToShow} />
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="p-2 rounded-full transition-colors"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-on-surface-variant)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-surface-container)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
            {pending && !detail && (
              <div className="flex flex-col items-center justify-center py-16 gap-3"
                   style={{ color: 'var(--admin-on-surface-variant)', fontFamily: 'var(--font-hanken)', fontSize: '0.875rem' }}>
                <Loader2 size={20} className="animate-spin" />
                <span>Loading order…</span>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="admin-card p-4"
                style={{
                  background: 'var(--admin-rose-fixed)',
                  color: 'var(--admin-on-rose-fixed)',
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.875rem',
                  border: '1px solid var(--admin-rose-container)',
                }}
              >
                Could not load order: {error}
              </p>
            )}

            {detail && <DrawerBody detail={detail} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DrawerBody({ detail }: { detail: OrderDetail }) {
  const fullName =
    [detail.student?.first_name, detail.student?.last_name].filter(Boolean).join(' ').trim() ||
    detail.student?.email ||
    'Unknown student'

  const palette = AVATAR_PALETTE[avatarPaletteIndex(detail.student?.id ?? detail.id)]
  const initials = getInitials(fullName)
  const joined = detail.student?.joined_at
    ? new Date(detail.student.joined_at).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <>
      {/* Student card */}
      <div
        className="p-3 rounded-lg flex items-center gap-3"
        style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)' }}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: palette.bg,
            color: palette.fg,
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}>
            {fullName}
          </p>
          {detail.student?.email && (
            <p className="truncate" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              color: 'var(--admin-on-surface-variant)',
              margin: 0,
            }}>
              {detail.student.email}
            </p>
          )}
          {joined && (
            <p className="flex items-center gap-1 mt-0.5" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.6875rem',
              color: 'var(--admin-on-surface-variant)',
              margin: 0,
            }}>
              <CalendarDays size={11} /> Student since {joined}
            </p>
          )}
        </div>
      </div>

      {/* Purchase overview */}
      <section>
        <p
          className="uppercase mb-3"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--admin-on-surface-variant)',
          }}
        >
          Purchase Overview
        </p>
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline gap-3">
            <span style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.9375rem', color: 'var(--admin-on-surface)' }}>
              {detail.course?.title ?? 'Standalone payment'}
            </span>
            <span style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.125rem',
              fontWeight: 500,
              color: 'var(--admin-on-surface)',
              whiteSpace: 'nowrap',
            }}>
              {formatCurrency(detail.amount, { precise: true })}
            </span>
          </div>
          <div
            className="flex justify-between items-baseline gap-3 pt-2"
            style={{ borderTop: '1px solid var(--admin-outline-variant)' }}
          >
            <span style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--admin-on-surface)',
            }}>
              Total
            </span>
            <span style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.5rem',
              fontWeight: 500,
              color: 'var(--admin-primary-container)',
              whiteSpace: 'nowrap',
            }}>
              {formatCurrency(detail.amount, { precise: true })}
            </span>
          </div>
        </div>
      </section>

      {/* Payment info */}
      <section>
        <p
          className="uppercase mb-3"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--admin-on-surface-variant)',
          }}
        >
          Payment Info
        </p>
        <div className="space-y-3">
          <InfoRow Icon={CreditCard} label="Method">
            <span style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem' }}>
              Stripe
            </span>
          </InfoRow>
          <InfoRow Icon={Hash} label="Payment ID">
            {detail.stripe_payment_id ? (
              <code style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.75rem',
                color: 'var(--admin-on-surface)',
                wordBreak: 'break-all',
              }}>
                {detail.stripe_payment_id}
              </code>
            ) : (
              <span style={{ color: 'var(--admin-on-surface-variant)' }}>—</span>
            )}
          </InfoRow>
          <InfoRow Icon={CalendarDays} label="Date & Time">
            <span style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem' }}>
              {new Date(detail.created_at).toLocaleString()}
            </span>
          </InfoRow>
          <InfoRow Icon={Receipt} label="Order ID">
            <code style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.75rem',
              color: 'var(--admin-on-surface-variant)',
              wordBreak: 'break-all',
            }}>
              {detail.id}
            </code>
          </InfoRow>
        </div>
      </section>

      {/* Disabled action footer — clarify why */}
      <section className="space-y-2">
        <button
          type="button"
          disabled
          title="Coming soon — requires a Resend email template"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'var(--admin-primary-container)',
            color: 'var(--admin-bg)',
            fontFamily: 'var(--font-hanken)',
            fontWeight: 700,
            fontSize: '0.8125rem',
            letterSpacing: '0.04em',
            border: 'none',
          }}
        >
          <RefreshCw size={14} />
          Resend Receipt
        </button>
        <button
          type="button"
          disabled
          title="Coming soon — requires confirmed Stripe refund flow"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'transparent',
            color: 'var(--admin-error)',
            border: '1px solid var(--admin-error)',
            fontFamily: 'var(--font-hanken)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.04em',
          }}
        >
          <ShieldAlert size={14} />
          Issue Full Refund
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-1.5 py-2"
          style={{
            background: 'transparent',
            color: 'var(--admin-on-surface-variant)',
            border: 'none',
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <Printer size={13} />
          Print this page
        </button>
        <p
          className="italic text-center"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            color: 'var(--admin-on-surface-variant)',
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          Receipt resend &amp; Stripe refunds will light up once their templates / confirmation flows are wired.
        </p>
      </section>
    </>
  )
}

function InfoRow({
  Icon, label, children,
}: {
  Icon: React.ComponentType<{ size?: number }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} />
      <div className="flex-1 min-w-0">
        <p
          className="uppercase"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--admin-on-surface-variant)',
            margin: 0,
          }}
        >
          {label}
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  )
}

function StatusInline({ status }: { status: string }) {
  const color =
    status === 'paid'      ? 'var(--admin-sage)' :
    status === 'pending'   ? 'var(--admin-on-sand-fixed)' :
    status === 'refunded'  ? 'var(--admin-on-surface-variant)' :
                              'var(--admin-error)'
  return (
    <span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>
      {status}
    </span>
  )
}
