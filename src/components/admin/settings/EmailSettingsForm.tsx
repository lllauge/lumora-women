'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { saveAdminSettings } from '@/app/actions/admin-settings'

export default function EmailSettingsForm({
  initial,
  enabled,
}: {
  initial: {
    support_email: string
    notify_new_enrollment: boolean
    notify_daily_revenue: boolean
  }
  enabled: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const [supportEmail, setSupportEmail] = useState(initial.support_email)
  const [notifyEnroll, setNotifyEnroll] = useState(initial.notify_new_enrollment)
  const [notifyRev,    setNotifyRev]    = useState(initial.notify_daily_revenue)

  function handleSubmit() {
    setResult(null)
    startTransition(async () => {
      const res = await saveAdminSettings({
        support_email: supportEmail,
        notify_new_enrollment: notifyEnroll,
        notify_daily_revenue: notifyRev,
      })
      setResult({
        ok: !!res.ok,
        msg: res.ok ? 'Settings saved.' : (res.error ?? 'Could not save settings.'),
      })
    })
  }

  return (
    <section className="admin-card p-6 space-y-5">
      <div>
        <h3 style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '1.375rem',
          fontWeight: 500,
          color: 'var(--admin-on-surface)',
          margin: 0,
        }}>
          Email Settings
        </h3>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.875rem',
          color: 'var(--admin-on-surface-variant)',
          marginTop: '0.25rem',
        }}>
          Support address and notification preferences.
        </p>
      </div>

      <fieldset disabled={!enabled} className={!enabled ? 'opacity-60' : ''}>
        <div className="space-y-4">
          <div>
            <label
              className="uppercase block mb-1.5"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--admin-on-surface-variant)',
              }}
            >
              Support Address
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="hello@lumorawomen.com"
              style={{ background: 'var(--admin-surface-low)' }}
            />
          </div>

          <div className="space-y-2">
            <p className="uppercase" style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--admin-on-surface-variant)',
              margin: 0,
            }}>
              Notification Toggles
            </p>
            <ToggleRow
              label="New Student Enrollment"
              description="Email me when a new student joins a course."
              checked={notifyEnroll}
              onChange={setNotifyEnroll}
            />
            <ToggleRow
              label="Daily Revenue Report"
              description="A morning summary of the previous day's financial performance."
              checked={notifyRev}
              onChange={setNotifyRev}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !enabled}
              className="admin-btn-primary"
              style={{ cursor: pending ? 'wait' : 'pointer' }}
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{pending ? 'Saving…' : 'Save Settings'}</span>
            </button>
            {result && (
              <p
                role="status"
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: result.ok ? 'var(--admin-sage)' : 'var(--admin-error)',
                  margin: 0,
                }}
              >
                {result.ok && <CheckCircle size={14} />}
                {result.msg}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {!enabled && (
        <p
          className="italic"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
            margin: 0,
          }}
        >
          Run <code>supabase-schema-v3.sql</code> to create the <code>settings</code> table
          and enable these preferences.
        </p>
      )}
    </section>
  )
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-3 rounded-md"
      style={{ background: 'var(--admin-surface-low)' }}
    >
      <div>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--admin-on-surface)',
          margin: 0,
        }}>
          {label}
        </p>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          color: 'var(--admin-on-surface-variant)',
          margin: 0,
        }}>
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  )
}

function Toggle({
  checked, onChange, ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{
        width: '40px',
        height: '22px',
        background: checked ? 'var(--admin-primary-container)' : 'var(--admin-surface-high)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <span
        className="absolute rounded-full transition-transform"
        style={{
          top: '2px',
          left: '2px',
          width: '18px',
          height: '18px',
          background: '#fff',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}
