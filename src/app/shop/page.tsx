import type { Metadata } from 'next'
import Link from 'next/link'
import { Package, ShoppingBag, Sparkles } from 'lucide-react'
import NavbarWrapper from '@/components/layout/NavbarWrapper'
import FooterWrapper from '@/components/layout/FooterWrapper'
import { createClient } from '@/lib/supabase/server'
import { isProductsTableAvailable, type StockStatus } from '@/lib/shop-schema'
import { formatCurrency } from '@/utils/format'

export const metadata: Metadata = {
  title: 'Shop | Lumora Women',
  description: 'Shop postpartum wellness products, supplements, apparel, and tools from Lumora Women.',
}

type Product = {
  id: string
  name: string
  description: string | null
  category: string | null
  price: number | string
  sale_price: number | string | null
  stock_status: StockStatus
  images: string[] | null
}

async function loadProducts(): Promise<Product[]> {
  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseConfigured) return []
  if (!(await isProductsTableAvailable())) return []

  const { data } = await (await createClient())
    .from('products')
    .select('id, name, description, category, price, sale_price, stock_status, images')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (data ?? []) as Product[]
}

export default async function ShopPage() {
  const products = await loadProducts()

  return (
    <>
      <NavbarWrapper />
      <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>
        <section style={{ background: '#162814', padding: '5rem 1.5rem 4rem' }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--botanical-light)',
                marginBottom: '1rem',
              }}
            >
              <Sparkles size={15} aria-hidden="true" />
              Wellness essentials
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                color: '#FFFFFF',
                lineHeight: 1.1,
                marginBottom: '1.25rem',
              }}
            >
              Shop Lumora Women
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '1.0625rem',
                color: 'rgba(200,220,192,0.82)',
                lineHeight: 1.7,
                maxWidth: '42rem',
                margin: '0 auto',
              }}
            >
              Practical postpartum and women&apos;s wellness support, from thoughtfully selected products to everyday tools.
            </p>
          </div>
        </section>

        <section style={{ maxWidth: '76rem', margin: '0 auto', padding: '3.5rem 1.5rem 4.5rem' }}>
          {products.length === 0 ? (
            <div
              style={{
                maxWidth: '42rem',
                margin: '0 auto',
                textAlign: 'center',
                background: '#FFFFFF',
                border: '1px solid rgba(200,220,192,0.35)',
                borderRadius: '1rem',
                padding: '3rem 1.5rem',
                boxShadow: '0 12px 30px -18px rgba(26,40,24,0.18)',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: '4rem',
                  height: '4rem',
                  borderRadius: '999px',
                  background: 'var(--pale-botanical)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <ShoppingBag size={26} style={{ color: 'var(--botanical-green)' }} />
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                }}
              >
                Products are coming soon
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.98rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  marginBottom: '1.75rem',
                }}
              >
                The shop is being stocked now. Browse courses today, or reach out if you need help choosing the right support.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/courses" className="btn-primary" style={{ borderRadius: '999px', padding: '0.85rem 1.5rem' }}>
                  Browse Courses
                </Link>
                <Link href="/contact" className="btn-secondary" style={{ borderRadius: '999px', padding: '0.85rem 1.5rem' }}>
                  Contact Us
                </Link>
              </div>
            </div>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <FooterWrapper />
    </>
  )
}

function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0] ?? null
  const price = Number(product.price ?? 0)
  const salePrice = product.sale_price != null ? Number(product.sale_price) : null
  const onSale = salePrice != null && salePrice < price
  const unavailable = product.stock_status === 'out_of_stock' || product.stock_status === 'coming_soon'

  return (
    <article
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200,220,192,0.35)',
        borderRadius: '1rem',
        overflow: 'hidden',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 30px -20px rgba(26,40,24,0.22)',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--section-tint)' }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={34} style={{ color: 'rgba(58,75,54,0.32)' }} />
          </div>
        )}
        {product.category && (
          <span
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '0.875rem',
              background: 'var(--rose-blush)',
              color: 'var(--text-primary)',
              borderRadius: '999px',
              padding: '0.35rem 0.65rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {product.category}
          </span>
        )}
      </div>
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            marginBottom: '0.5rem',
          }}
        >
          {product.name}
        </h2>
        {product.description && (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '1rem',
            }}
          >
            {product.description}
          </p>
        )}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, color: 'var(--text-primary)' }}>
            {onSale ? (
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.45rem' }}>
                <span>{formatCurrency(salePrice, { precise: true })}</span>
                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontWeight: 600, fontSize: '0.82rem' }}>
                  {formatCurrency(price, { precise: true })}
                </span>
              </span>
            ) : (
              formatCurrency(price, { precise: true })
            )}
          </div>
          <Link
            href="/contact"
            aria-disabled={unavailable}
            className={unavailable ? 'btn-secondary' : 'btn-primary'}
            style={{
              borderRadius: '999px',
              padding: '0.65rem 1rem',
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
              opacity: unavailable ? 0.72 : 1,
            }}
          >
            {product.stock_status === 'coming_soon'
              ? 'Coming Soon'
              : product.stock_status === 'out_of_stock'
                ? 'Sold Out'
                : 'Ask to Order'}
          </Link>
        </div>
      </div>
    </article>
  )
}
