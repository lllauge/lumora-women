'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowLeft, CloudCheck, CloudOff, Loader2 } from 'lucide-react'
import {
  saveProduct, uploadProductImage,
  type UploadProductImageResult,
} from '@/app/actions/admin-shop'
import { STOCK_STATUS_OPTIONS, type StockStatus } from '@/lib/shop-constants'
import ProductImagesUploader from './ProductImagesUploader'

export type ProductInitial = {
  id?: string
  name: string
  description: string
  category: string
  price: number
  sale_price: number | null
  stock_status: StockStatus
  images: string[]
  published: boolean
}

export default function ProductEditor({
  initial,
  mode,
  r2Configured,
}: {
  initial: ProductInitial
  mode: 'new' | 'edit'
  r2Configured: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const [name, setName]               = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [category, setCategory]       = useState(initial.category)
  const [price, setPrice]             = useState(initial.price)
  const [salePrice, setSalePrice]     = useState<number | null>(initial.sale_price)
  const [stockStatus, setStockStatus] = useState<StockStatus>(initial.stock_status)
  const [images, setImages]           = useState<string[]>(initial.images)

  async function uploadImage(file: File): Promise<UploadProductImageResult> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('productId', initial.id ?? 'unfiled')
    return uploadProductImage(fd)
  }

  function buildPayload() {
    return {
      id: initial.id,
      name,
      description,
      category,
      price,
      sale_price: salePrice,
      stock_status: stockStatus,
      images,
    }
  }

  function handleSave(publish: boolean) {
    setErrorMsg(null)
    if (!name.trim()) {
      setErrorMsg('Please add a product name before saving.')
      return
    }
    startTransition(async () => {
      const result = await saveProduct(buildPayload(), { publish })
      if (!result.ok) {
        setErrorMsg(result.error)
        return
      }
      setLastSavedAt(new Date())
      if (mode === 'new') router.push(`/admin/shop/edit/${result.productId}`)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/shop"
          className="inline-flex items-center gap-2 transition-colors"
          style={{
            color: 'var(--admin-on-surface-variant)',
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to Shop</span>
        </Link>
        <div className="h-4 w-px" style={{ background: 'var(--admin-outline-variant)' }} />
        <h2
          style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
          }}
        >
          {mode === 'new' ? 'New Product' : `Edit · ${name || 'Untitled product'}`}
        </h2>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="admin-card p-4 flex items-start gap-3"
          style={{
            background: 'var(--admin-rose-fixed)',
            borderColor: 'var(--admin-rose-container)',
            color: 'var(--admin-on-rose-fixed)',
          }}
        >
          <CloudOff size={18} className="mt-0.5 shrink-0" />
          <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.875rem', margin: 0 }}>
            {errorMsg}
          </p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6 items-start">

        {/* ── Left: basics ─────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          <section className="admin-card p-6 space-y-5">
            <Field label="Product Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Golden Radiance Elixir"
                style={{ background: 'var(--admin-surface-low)', fontSize: '1rem' }}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What it is, who it's for, what's inside…"
                style={{ background: 'var(--admin-surface-low)' }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Supplements, Apparel, Wellness Tools…"
                  style={{ background: 'var(--admin-surface-low)', fontSize: '0.875rem' }}
                />
              </Field>
              <Field label="Stock Status">
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value as StockStatus)}
                  style={{ background: 'var(--admin-surface-low)', fontSize: '0.875rem' }}
                >
                  {STOCK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (USD)">
                <div className="relative">
                  <span style={{
                    position: 'absolute', left: '0.875rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--admin-on-surface-variant)',
                  }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                    style={{ paddingLeft: '2rem', background: 'var(--admin-surface-low)' }}
                  />
                </div>
              </Field>
              <Field label="Sale Price (optional)">
                <div className="relative">
                  <span style={{
                    position: 'absolute', left: '0.875rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--admin-on-surface-variant)',
                  }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={salePrice ?? ''}
                    placeholder="—"
                    onChange={(e) => {
                      const v = e.target.value
                      setSalePrice(v === '' ? null : Math.max(0, Number(v) || 0))
                    }}
                    style={{ paddingLeft: '2rem', background: 'var(--admin-surface-low)' }}
                  />
                </div>
              </Field>
            </div>

            {salePrice != null && salePrice >= price && (
              <p style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.75rem',
                color: 'var(--admin-on-sand-fixed)',
                background: 'var(--admin-sand-fixed)',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                margin: 0,
              }}>
                Heads up — sale price isn&apos;t lower than the regular price.
              </p>
            )}
          </section>

          {/* Images */}
          <section className="admin-card p-6 space-y-3">
            <p
              className="uppercase"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
                margin: 0,
              }}
            >
              Product Images
            </p>
            <p style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              color: 'var(--admin-on-surface-variant)',
              margin: 0,
            }}>
              First image is the primary thumbnail. Drag to reorder using the arrows on hover.
            </p>
            <ProductImagesUploader
              images={images}
              onChange={setImages}
              uploadImage={uploadImage}
              r2Configured={r2Configured}
            />
          </section>
        </div>

        {/* ── Right: summary ───────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <section className="admin-card p-5 space-y-4">
            <h4
              className="uppercase"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
                margin: 0,
              }}
            >
              Preview
            </h4>
            <div className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                 style={{ background: 'var(--admin-surface-low)' }}>
              {images[0] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={images[0]} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span style={{
                  fontFamily: 'var(--font-eb-garamond)',
                  fontSize: '2rem',
                  color: 'var(--admin-outline-variant)',
                }}>L</span>
              )}
            </div>
            <div>
              <p
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-hanken)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: 'var(--admin-on-surface-variant)',
                  margin: 0,
                }}
              >
                {category || 'Uncategorised'}
              </p>
              <p style={{
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '1.125rem',
                color: 'var(--admin-on-surface)',
                margin: '0.25rem 0 0',
                fontWeight: 500,
              }}>
                {name || 'Untitled product'}
              </p>
              <p className="mt-2 flex items-baseline gap-2" style={{
                fontFamily: 'var(--font-hanken)',
                color: 'var(--admin-on-surface)',
                margin: '0.5rem 0 0',
              }}>
                {salePrice != null && salePrice < price ? (
                  <>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-error)' }}>
                      ${salePrice.toFixed(2)}
                    </span>
                    <span style={{
                      fontSize: '0.8125rem',
                      color: 'var(--admin-on-surface-variant)',
                      textDecoration: 'line-through',
                    }}>
                      ${price.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                    ${price.toFixed(2)}
                  </span>
                )}
              </p>
              <span className={
                'admin-pill mt-2 inline-flex ' +
                (stockStatus === 'in_stock'     ? 'admin-pill-success' :
                 stockStatus === 'low_stock'    ? 'admin-pill-warning' :
                 stockStatus === 'out_of_stock' ? 'admin-pill-error'   :
                                                  'admin-pill-neutral')
              }>
                {STOCK_STATUS_OPTIONS.find((o) => o.value === stockStatus)?.label ?? stockStatus}
              </span>
            </div>
          </section>

          <section className="admin-card p-5 space-y-3">
            <h4
              className="uppercase"
              style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--admin-on-surface-variant)',
                margin: 0,
              }}
            >
              Publish Status
            </h4>
            <p style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              color: 'var(--admin-on-surface-variant)',
              margin: 0,
            }}>
              Currently: <strong style={{
                color: initial.published ? 'var(--admin-sage)' : 'var(--admin-on-surface-variant)',
              }}>{initial.published ? 'Published' : 'Draft / Archived'}</strong>
              <br />
              Use Save Draft / Publish below to change.
            </p>
          </section>
        </div>
      </div>

      {/* Sticky save bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md admin-save-bar"
        style={{
          height: '80px',
          background: 'rgba(250, 249, 244, 0.92)',
          borderTop: '1px solid var(--admin-outline-variant)',
          paddingLeft: 'var(--admin-container-pad)',
          paddingRight: 'var(--admin-container-pad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          className="flex items-center gap-3 save-bar-status"
          style={{ color: 'var(--admin-on-surface-variant)', fontFamily: 'var(--font-hanken)', fontSize: '0.875rem' }}
        >
          {pending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span className="save-bar-status-text">Saving…</span>
            </>
          ) : lastSavedAt ? (
            <>
              <CloudCheck size={18} style={{ color: 'var(--admin-sage)' }} />
              <span className="save-bar-status-text">Last saved at {lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </>
          ) : (
            <>
              <CloudOff size={18} style={{ opacity: 0.5 }} />
              <span className="save-bar-status-text">Unsaved changes</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSave(false)}
            className="px-7 py-3 rounded-full transition-all disabled:opacity-60"
            style={{
              border: '1px solid var(--admin-primary-container)',
              color: 'var(--admin-primary-container)',
              background: 'transparent',
              fontFamily: 'var(--font-hanken)',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              cursor: pending ? 'wait' : 'pointer',
            }}
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSave(true)}
            className="px-8 py-3 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'var(--admin-primary-container)',
              color: 'var(--admin-bg)',
              border: '1px solid var(--admin-primary-container)',
              fontFamily: 'var(--font-hanken)',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              cursor: pending ? 'wait' : 'pointer',
              boxShadow: '0 8px 20px -8px rgba(0, 30, 20, 0.35)',
            }}
          >
            {initial.published ? 'Update & Publish' : 'Publish Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="uppercase block mb-2"
        style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'var(--admin-on-surface-variant)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
