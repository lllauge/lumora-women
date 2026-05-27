'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle2, CreditCard, Cloud, Database, Loader2, ShieldOff, Upload,
} from 'lucide-react'
import { runR2UploadTest } from '@/app/actions/admin-settings'

export type IntegrationCheck = {
  key: 'supabase' | 'stripe' | 'r2'
  name: string
  description: string
  connected: boolean
  note?: string
}

export default function IntegrationStatus({ checks }: { checks: IntegrationCheck[] }) {
  const [testing, startTest] = useTransition()
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; url?: string } | null>(null)

  function handleR2Test() {
    setTestResult(null)
    startTest(async () => {
      const result = await runR2UploadTest()
      setTestResult(
        result.ok
          ? { ok: true,  msg: result.message, url: result.url }
          : { ok: false, msg: result.error }
      )
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
          Integrations
        </h3>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.875rem',
          color: 'var(--admin-on-surface-variant)',
          marginTop: '0.25rem',
        }}>
          Third-party services powering your Lumora ecosystem.
        </p>
      </div>

      <ul className="space-y-2.5">
        {checks.map((c) => <IntegrationRow key={c.key} check={c} />)}
      </ul>

      <div className="h-px" style={{ background: 'var(--admin-outline-variant)', opacity: 0.6 }} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--admin-on-surface)',
            margin: 0,
          }}>
            R2 Upload Test
          </p>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.75rem',
            color: 'var(--admin-on-surface-variant)',
            marginTop: '0.125rem',
          }}>
            Sends a tiny 1×1 PNG to your bucket to confirm credentials work.
          </p>
        </div>
        <button
          type="button"
          onClick={handleR2Test}
          disabled={testing}
          className="admin-btn-secondary"
          style={{ cursor: testing ? 'wait' : 'pointer' }}
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          <span>{testing ? 'Uploading…' : 'Run Upload Test'}</span>
        </button>
      </div>

      {testResult && (
        <p
          role="status"
          className="flex items-start gap-2 p-3 rounded-md"
          style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.8125rem',
            background: testResult.ok ? 'var(--admin-sage-container)' : 'var(--admin-rose-fixed)',
            color:      testResult.ok ? 'var(--admin-on-sage-container)' : 'var(--admin-on-rose-fixed)',
            margin: 0,
          }}
        >
          {testResult.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <ShieldOff size={14} className="mt-0.5 shrink-0" />}
          <span>
            {testResult.msg}
            {testResult.url && (
              <>
                {' '}
                <a
                  href={testResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                  style={{ color: 'inherit' }}
                >
                  View uploaded file
                </a>
              </>
            )}
          </span>
        </p>
      )}
    </section>
  )
}

function IntegrationRow({ check }: { check: IntegrationCheck }) {
  const Icon =
    check.key === 'stripe'   ? CreditCard :
    check.key === 'supabase' ? Database   :
                                Cloud
  return (
    <li
      className="p-3 rounded-lg flex items-center gap-3"
      style={{ background: 'var(--admin-surface-low)', border: '1px solid var(--admin-outline-variant)' }}
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center shrink-0"
        style={{ background: 'var(--admin-surface)', color: 'var(--admin-primary-container)' }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--admin-on-surface)',
          margin: 0,
        }}>
          {check.name}
        </p>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          color: 'var(--admin-on-surface-variant)',
          margin: 0,
        }}>
          {check.description}
          {check.note && <span style={{ opacity: 0.7 }}> · {check.note}</span>}
        </p>
      </div>
      <span className={`admin-pill ${check.connected ? 'admin-pill-success' : 'admin-pill-error'}`}>
        {check.connected ? 'Connected' : 'Not Connected'}
      </span>
    </li>
  )
}
