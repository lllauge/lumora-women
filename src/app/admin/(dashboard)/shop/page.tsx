import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Package, Pencil, Plus, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatNumber } from '@/utils/format'
import ShopFilters from '@/components/admin/ShopFilters'
import ArchiveProductButton from '@/components/admin/ArchiveProductButton'
import { isProductsTableAvailable, STOCK_STATUS_OPTIONS, type StockStatus } from '@/lib/shop-schema'

export const metadata: Metadata = {
  title: 'Shop Manager',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 12

type SearchParams = Promise<{ q?: string; category?: string; page?: string }>

type ProductRow = {
  id: string
  name: string
  category: string | null
  price: number | string
  sale_price: number | string | null
  stock_status: StockStatus
  images: string[]
  published: boolean
  created_at: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function loadProducts(sp: Awaited<SearchParams>) {
  const supabase = await createClient()

  const q        = (sp.q ?? '').trim()
  const category = (sp.category ?? 'all').toLowerCase()
  const page     = Math.max(1, Number(sp.page ?? '1') || 1)
  const from     = (page - 1) * PAGE_SIZE
  const to       = from + PAGE_SIZE - 1
  const safeQ    = q.replace(/[%,]/g, '')

  let query = supabase
    .from('products')
    .select('id, name, category, price, sale_price, stock_status, images, published, created_at',
            { count: 'exact' })
    .order('created_at', { ascending: false })

  if (safeQ)               query = query.ilike('name', `%${safeQ}%`)
  if (category !== 'all')  query = query.ilike('category', category)

  const { data, count } = await query.range(from, to)

  // Distinct categories for the filter pills
  const { data: catRows } = await supabase
    .from('products').select('category')
    .not('category', 'is', null)
  const categories = Array.from(
    new Set(((catRows ?? []) as { category: string | null }[]).map((r) => r.category).filter(Boolean) as string[])
  ).sort()

  return {
    products: (data ?? []) as ProductRow[],
    total: count ?? 0,
    page,
    categories,
    filters: { q, category },
  }
}

async function loadShopStats() {
  const supabase = await createClient()
  const [totalQ, publishedQ, lowStockQ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('products').select('id', { count: 'exact', head: true }).in('stock_status', ['low_stock', 'out_of_stock']),
  ])
  return {
    total: totalQ.count ?? 0,
    published: publishedQ.count ?? 0,
    needsAttention: lowStockQ.count ?? 0,
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function StockBadge({ status }: { status: StockStatus }) {
  const opt = STOCK_STATUS_OPTIONS.find((o) => o.value === status)
  const klass =
    opt?.tone === 'success' ? 'admin-pill-success' :
    opt?.tone === 'warning' ? 'admin-pill-warning' :
    opt?.tone === 'error'   ? 'admin-pill-error'   :
                              'admin-pill-neutral'
  return <span className={`admin-pill ${klass}`}>{opt?.label ?? status}</span>
}

function MissingTableNotice() {
  return (
    <div className="admin-card p-10 text-center max-w-2xl mx-auto" style={{ background: 'var(--admin-surface-low)' }}>
      <Package size={36} style={{ color: 'var(--admin-on-surface-variant)', margin: '0 auto 1rem' }} />
      <h3 style={{
        fontFamily: 'var(--font-eb-garamond)',
        fontSize: '1.5rem',
        fontWeight: 500,
        color: 'var(--admin-on-surface)',
        marginBottom: '0.75rem',
      }}>
        Shop schema not yet installed
      </h3>
      <p style={{
        fontFamily: 'var(--font-hanken)',
        fontSize: '0.9375rem',
        color: 'var(--admin-on-surface-variant)',
        lineHeight: 1.55,
        maxWidth: '36rem',
        margin: '0 auto',
      }}>
        The shop needs the <code>products</code> table from <code>supabase-schema-v3.sql</code>.
        Run that migration in your Supabase SQL editor, then refresh this page.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseConfigured) return <MissingTableNotice />
  if (!(await isProductsTableAvailable())) return <MissingTableNotice />

  const [data, stats] = await Promise.all([loadProducts(sp), loadShopStats()])
  const { products, total, page, categories, filters } = data

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (filters.q)              params.set('q', filters.q)
    if (filters.category !== 'all') params.set('category', filters.category)
    if (p > 1)                  params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/shop?${qs}` : '/admin/shop'
  }

  return (
    <div className="space-y-6">

      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
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
            Shop Products
          </p>
          <p style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.875rem',
            color: 'var(--admin-on-surface-variant)',
            marginTop: '0.25rem',
          }}>
            {formatNumber(total)} {total === 1 ? 'product' : 'products'} ·
            {' '}{stats.published} published ·
            {' '}{stats.needsAttention} low/out of stock
          </p>
        </div>
        <Link href="/admin/shop/new" className="admin-btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          Add New Product
        </Link>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatTile
          label="Total Products"
          value={formatNumber(stats.total)}
          sub={stats.total === 0 ? 'Add your first product to get started' : `${stats.published} of ${stats.total} live`}
          icon={Package}
        />
        <StatTile
          label="Needs Attention"
          value={formatNumber(stats.needsAttention)}
          sub={stats.needsAttention === 0
            ? 'All stock levels look healthy'
            : 'Low / out of stock — review now'}
          icon={TrendingUp}
          warningTone={stats.needsAttention > 0}
        />
        <div
          className="p-6 rounded-xl flex flex-col justify-between"
          style={{
            background: 'var(--admin-primary-container)',
            color: 'var(--admin-bg)',
            minHeight: '120px',
          }}
        >
          <p className="uppercase" style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            opacity: 0.7,
          }}>
            Shop Status
          </p>
          <div className="mt-3">
            <p style={{
              fontFamily: 'var(--font-eb-garamond)',
              fontSize: '1.5rem',
              fontWeight: 500,
              color: 'var(--admin-bg)',
              lineHeight: 1.2,
              margin: 0,
            }}>
              {stats.published > 0 ? 'Open for business' : 'No products live yet'}
            </p>
            <p style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.75rem',
              opacity: 0.7,
              marginTop: '0.25rem',
            }}>
              {stats.published > 0
                ? `Public catalogue shows ${stats.published} item${stats.published === 1 ? '' : 's'}`
                : 'Publish a product to show it on /shop'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ShopFilters categories={categories} />

      {/* Grid */}
      {products.length === 0 ? (
        <div className="admin-card p-16 text-center">
          <p style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1.125rem',
            color: 'var(--admin-on-surface-variant)',
          }}>
            {filters.q || filters.category !== 'all'
              ? 'No products match those filters.'
              : 'No products yet — add your first to get started.'}
          </p>
          <Link href="/admin/shop/new" className="admin-btn-primary mt-4 inline-flex">
            <Plus size={16} strokeWidth={2.5} /> Add New Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          {page > 1 ? (
            <Link href={buildHref(page - 1)} aria-label="Previous page"
                  className="p-2 rounded-lg transition-colors"
                  style={{ border: '1px solid var(--admin-outline-variant)', background: 'var(--admin-surface)' }}>
              <ChevronLeft size={18} />
            </Link>
          ) : (
            <span className="p-2 opacity-30" style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: '0.5rem' }}>
              <ChevronLeft size={18} />
            </span>
          )}
          <span
            className="px-4 inline-flex items-center"
            style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--admin-on-surface)',
            }}
          >
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildHref(page + 1)} aria-label="Next page"
                  className="p-2 rounded-lg transition-colors"
                  style={{ border: '1px solid var(--admin-outline-variant)', background: 'var(--admin-surface)' }}>
              <ChevronRight size={18} />
            </Link>
          ) : (
            <span className="p-2 opacity-30" style={{ border: '1px solid var(--admin-outline-variant)', borderRadius: '0.5rem' }}>
              <ChevronRight size={18} />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: ProductRow }) {
  const primaryImg = product.images?.[0] ?? null
  const price = Number(product.price ?? 0)
  const salePrice = product.sale_price != null ? Number(product.sale_price) : null
  const onSale = salePrice != null && salePrice < price

  return (
    <div
      className="admin-card overflow-hidden flex flex-col group"
      style={{ borderRadius: '0.75rem' }}
    >
      {/* Image */}
      <div
        className="relative aspect-square flex items-center justify-center"
        style={{ background: 'var(--admin-surface-low)' }}
      >
        {primaryImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={primaryImg} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={32} style={{ color: 'var(--admin-outline-variant)' }} />
        )}
        <div className="absolute top-2.5 left-2.5">
          <StockBadge status={product.stock_status} />
        </div>
        {!product.published && (
          <span
            className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px]"
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontFamily: 'var(--font-hanken)',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Draft
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <p className="uppercase" style={{
            fontFamily: 'var(--font-hanken)',
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--admin-on-surface-variant)',
            margin: 0,
          }}>
            {product.category}
          </p>
        )}
        <Link
          href={`/admin/shop/edit/${product.id}`}
          className="hover:underline"
          style={{
            fontFamily: 'var(--font-eb-garamond)',
            fontSize: '1rem',
            fontWeight: 500,
            color: 'var(--admin-on-surface)',
            textDecoration: 'none',
            display: 'block',
            marginTop: '0.25rem',
            lineHeight: 1.25,
          }}
        >
          {product.name}
        </Link>

        <div className="mt-2 flex items-baseline gap-2">
          {onSale ? (
            <>
              <span style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'var(--admin-error)',
              }}>
                {formatCurrency(salePrice!, { precise: true })}
              </span>
              <span style={{
                fontFamily: 'var(--font-hanken)',
                fontSize: '0.75rem',
                color: 'var(--admin-on-surface-variant)',
                textDecoration: 'line-through',
              }}>
                {formatCurrency(price, { precise: true })}
              </span>
            </>
          ) : (
            <span style={{
              fontFamily: 'var(--font-hanken)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--admin-primary-container)',
            }}>
              {formatCurrency(price, { precise: true })}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-end gap-1"
             style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
          <Link
            href={`/admin/shop/edit/${product.id}`}
            aria-label={`Edit ${product.name}`}
            title="Edit"
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--admin-on-surface-variant)' }}
          >
            <Pencil size={14} />
          </Link>
          <ArchiveProductButton productId={product.id} productName={product.name} />
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label, value, sub, icon: Icon, warningTone = false,
}: {
  label: string
  value: string
  sub: string
  icon: React.ComponentType<{ size?: number }>
  warningTone?: boolean
}) {
  return (
    <div
      className="admin-card p-6 flex flex-col justify-between"
      style={{ minHeight: '120px' }}
    >
      <div className="flex justify-between items-start">
        <p className="uppercase" style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'var(--admin-on-surface-variant)',
        }}>
          {label}
        </p>
        <Icon size={18} />
      </div>
      <div className="mt-3">
        <h3 style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '2rem',
          fontWeight: 500,
          color: warningTone && value !== '0'
            ? 'var(--admin-on-sand-fixed)'
            : 'var(--admin-on-surface)',
          lineHeight: 1.1,
          margin: 0,
        }}>
          {value}
        </h3>
        <p className="mt-1" style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.75rem',
          color: 'var(--admin-on-surface-variant)',
        }}>
          {sub}
        </p>
      </div>
    </div>
  )
}
