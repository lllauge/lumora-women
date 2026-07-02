'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState, useTransition } from 'react'
import { Loader2, X, CalendarDays, Receipt } from 'lucide-react'
import {
  getStudentDetail,
  resetStudentMfa,
  type StudentDetail,
  type CourseProgress,
  type OrderHistoryItem,
} from '@/app/actions/admin-students'
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

export default function StudentDrawer({
  trigger,
  userId,
  initialName,
}: {
  trigger: React.ReactNode
  userId: string
  initialName: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && !detail) {
      setError(null)
      startTransition(async () => {
        const result = await getStudentDetail(userId)
        if (result.ok) setDetail(result.detail)
        else setError(result.error)
      })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          className="fixed inset-0 z-[60] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          style={{ background: 'rgba(27, 28, 25, 0.35)', backdropFilter: 'blur(2px)' }}
        />

        {/* Side panel */}
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
            <Dialog.Title asChild>
              <h3
                className="truncate"
                style={{
                  fontFamily: 'var(--font-eb-garamond)',
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  color: 'var(--admin-on-surface)',
                  margin: 0,
                }}
              >
                {detail
                  ? `${detail.user.first_name ?? ''} ${detail.user.last_name ?? ''}`.trim() || detail.user.email
                  : initialName}
              </h3>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="p-2 rounded-full transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--admin-on-surface-variant)',
                }}
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
                <span>Loading student details…</span>
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
                Could not load student details: {error}
              </p>
            )}

            {detail && <DrawerBody detail={detail} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DrawerBody({ detail }: { detail: StudentDetail }) {
  const [resetCode, setResetCode] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetPending, startReset] = useTransition()
  const fullName =
    [detail.user.first_name, detail.user.last_name].filter(Boolean).join(' ').trim() ||
    detail.user.email
  const palette = AVATAR_PALETTE[avatarPaletteIndex(detail.user.id)]
  const initials = getInitials(fullName)

  // Average progress across enrollments (weighted by total lessons)
  const totalLessons = detail.enrollments.reduce((a, e) => a + e.total_lessons, 0)
  const totalCompleted = detail.enrollments.reduce((a, e) => a + e.completed_lessons, 0)
  const engagementPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0

  const joinedDate = new Date(detail.user.created_at)
  const joinedLabel = joinedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <>
      {/* Avatar + name + meta */}
      <div className="flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
          style={{
            background: palette.bg,
            color: palette.fg,
            fontFamily: 'var(--font-hanken)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            border: '3px solid var(--admin-surface)',
            boxShadow: '0 4px 12px -4px rgba(21,51,40,0.15)',
          }}
        >
          {initials}
        </div>
        <h4
          style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}
        >
          {fullName}
        </h4>
        <p
          className="mt-1"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            color: 'var(--admin-on-surface-variant)',
            margin: 0,
          }}
        >
          {detail.user.email}
        </p>
        <p
          className="mt-1 flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
            margin: 0,
          }}
        >
          <CalendarDays size={12} />
          Student since {joinedLabel}
        </p>
      </div>

      {/* Stats — Total Spent + Engagement */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-4 rounded-lg"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-outline-variant)' }}
        >
          <p
            className="uppercase"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--admin-on-surface-variant)',
              margin: 0,
            }}
          >
            Total Spent
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.5rem',
              fontWeight: 500,
              color: 'var(--admin-primary-container)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {formatCurrency(detail.totalSpent, { precise: true })}
          </p>
        </div>
        <div
          className="p-4 rounded-lg"
          style={{ background: 'var(--admin-sage-container)' }}
        >
          <p
            className="uppercase"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--admin-on-sage-container)',
              margin: 0,
            }}
          >
            Engagement
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.5rem',
              fontWeight: 500,
              color: 'var(--admin-on-sage-container)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {totalLessons > 0 ? `${engagementPct}%` : '—'}
          </p>
        </div>
      </div>

      <div className="admin-card p-4">
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--admin-on-surface)', marginBottom: '0.375rem' }}>
          Two-step verification recovery
        </p>
        <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)', lineHeight: 1.45, marginBottom: '0.625rem' }}>
          Only use this after verifying the student’s identity. The student will be logged out and must enroll MFA again.
        </p>
        <input
          aria-label="Your administrator authentication code"
          inputMode="numeric"
          maxLength={6}
          value={resetCode}
          onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Your 6-digit admin code"
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid var(--admin-outline-variant)' }}
        />
        <button
          type="button"
          disabled={resetPending || resetCode.length !== 6}
          onClick={() => {
            if (!window.confirm(`Reset two-step authentication for ${detail.user.email}?`)) return
            setResetMessage('')
            startReset(async () => {
              const result = await resetStudentMfa(detail.user.id, resetCode)
              setResetMessage(result.ok
                ? 'MFA reset completed. Ask the student to sign in and enroll again.'
                : result.error ?? 'MFA reset failed.')
              if (result.ok) setResetCode('')
            })
          }}
          style={{ marginTop: '0.5rem', padding: '0.625rem 0.75rem', border: 0, borderRadius: '0.5rem', background: 'var(--admin-rose-container)', color: 'var(--admin-on-rose-container)', fontWeight: 800, cursor: 'pointer' }}
        >
          {resetPending ? 'Resetting…' : 'Reset student MFA'}
        </button>
        {resetMessage && <p role="status" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-on-surface-variant)' }}>{resetMessage}</p>}
      </div>

      {/* Current Progress */}
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
          Current Progress
        </p>
        {detail.enrollments.length === 0 ? (
          <p
            className="italic py-3"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            Not enrolled in any courses yet.
          </p>
        ) : (
          <div className="space-y-4">
            {detail.enrollments.map((e) => <ProgressRow key={e.course_id} enrollment={e} />)}
          </div>
        )}
      </section>

      {/* Order History */}
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
          Order History
        </p>
        {detail.orders.length === 0 ? (
          <p
            className="italic py-3"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              color: 'var(--admin-on-surface-variant)',
            }}
          >
            No orders yet.
          </p>
        ) : (
          <div className="space-y-2">
            {detail.orders.map((o) => <OrderRow key={o.id} order={o} />)}
          </div>
        )}
      </section>

      {/* Admin notes — schema column not yet exists */}
      <section>
        <p
          className="uppercase mb-2"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--admin-on-surface-variant)',
          }}
        >
          Admin Notes
        </p>
        <textarea
          rows={3}
          disabled
          placeholder="Private notes per-student will be available once users.notes is added in a future migration."
          style={{
            background: 'var(--admin-surface-low)',
            fontSize: '0.8125rem',
            opacity: 0.7,
            cursor: 'not-allowed',
          }}
        />
      </section>
    </>
  )
}

function ProgressRow({ enrollment }: { enrollment: CourseProgress }) {
  const pct = enrollment.total_lessons > 0
    ? Math.round((enrollment.completed_lessons / enrollment.total_lessons) * 100)
    : 0

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <p
          className="truncate pr-3"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}
        >
          {enrollment.course_title}
        </p>
        <span
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--admin-on-surface-variant)',
            whiteSpace: 'nowrap',
          }}
        >
          {enrollment.total_lessons > 0
            ? `${pct}%`
            : 'No lessons'}
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ background: 'var(--admin-surface-high)', height: '6px' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'var(--admin-sage)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <p
        className="mt-1"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          color: 'var(--admin-on-surface-variant)',
        }}
      >
        {enrollment.completed_lessons}/{enrollment.total_lessons} lessons ·
        Enrolled {formatShortDate(enrollment.enrolled_at)}
      </p>
    </div>
  )
}

function OrderRow({ order }: { order: OrderHistoryItem }) {
  const statusPillClass =
    order.status === 'paid'     ? 'admin-pill-success' :
    order.status === 'pending'  ? 'admin-pill-warning' :
                                  'admin-pill-error'

  return (
    <div
      className="p-3 rounded-lg flex items-start gap-3"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-outline-variant)' }}
    >
      <Receipt size={16} style={{ color: 'var(--admin-on-surface-variant)', flexShrink: 0, marginTop: '2px' }} />
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}
        >
          {order.course_title ?? 'Standalone payment'}
        </p>
        <p
          className="mt-0.5"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            color: 'var(--admin-on-surface-variant)',
            margin: 0,
          }}
        >
          {formatShortDate(order.created_at)}
          {order.stripe_payment_id && <> · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{order.stripe_payment_id.slice(0, 16)}…</span></>}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}
        >
          {formatCurrency(order.amount, { precise: true })}
        </p>
        <span className={`admin-pill ${statusPillClass} mt-1`} style={{ fontSize: '0.5625rem', padding: '0.15rem 0.5rem' }}>
          {order.status}
        </span>
      </div>
    </div>
  )
}
