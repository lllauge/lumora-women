'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Loader2, ShoppingBag } from 'lucide-react'
import { saveAdminSettings } from '@/app/actions/admin-settings'

export default function SiteSettingsForm({
  initial,
  enabled,
}: {
  initial: { show_shop: boolean }
  enabled: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showShop, setShowShop] = useState(initial.show_shop)

  function handleSave() {
    setResult(null)
    startTransition(async () => {
      const res = await saveAdminSettings({ show_shop: showShop })
      setResult({
        ok: !!res.ok,
        msg: res.ok ? 'Saved!' : (res.error ?? 'Could not save.'),
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
          Site Visibility
        </h3>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.875rem',
          color: 'var(--admin-on-surface-variant)',
          marginTop: '0.25rem',
        }}>
          Control which sections appear in the public navigation and footer.
        </p>
      </div>

      <fieldset disabled={!enabled} className={!enabled ? 'opacity-60' : ''}>
        <div className="space-y-4">

          {/* Shop toggle */}
          <div
            className="flex items-center justify-between gap-4 p-4 rounded-lg"
            style={{
              background: 'var(--admin-surface-low)',
              border: '1px solid var(--admin-outline-variant)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2 flex items-center justify-center"
                style={{ background: showShop ? 'var(--admin-sage-container)' : 'var(--admin-surface)' }}
              >
                <ShoppingBag size={18} style={{ color: showShop ? 'var(--admin-primary-container)' : 'var(--admin-outline-variant)' }} />
              </div>
              <div>
                <p style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: 'var(--admin-on-surface)',
                  margin: 0,
                }}>
                  Shop
                </p>
                <p style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.8125rem',
                  color: 'var(--admin-on-surface-variant)',
                  margin: 0,
                }}>
                  {showShop
                    ? 'Visible — shop link shows in the nav and footer.'
                    : 'Hidden — shop link is removed from the nav and footer.'}
                </p>
              </div>
            </div>

            {/* Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={showShop}
              aria-label="Show shop"
              onClick={() => setShowShop((v) => !v)}
              className="relative shrink-0 rounded-full transition-colors"
              style={{
                width: '40px',
                height: '22px',
                background: showShop ? 'var(--admin-primary-container)' : 'var(--admin-surface-high)',
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
                  transform: showShop ? 'translateX(18px)' : 'translateX(0)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
                }}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !enabled}
              className="admin-btn-primary"
              style={{ cursor: pending ? 'wait' : 'pointer' }}
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{pending ? 'Saving…' : 'Save'}</span>
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
        <p className="italic" style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          color: 'var(--admin-on-surface-variant)',
          margin: 0,
        }}>
          Run <code>supabase-schema-v3.sql</code> to enable site settings.
        </p>
      )}
    </section>
  )
}
