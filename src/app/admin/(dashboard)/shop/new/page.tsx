import type { Metadata } from 'next'
import ProductEditor from '@/components/admin/shop-editor/ProductEditor'
import { isR2Configured } from '@/lib/r2'
import { isProductsTableAvailable } from '@/lib/shop-schema'

export const metadata: Metadata = {
  title: 'New Product',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  if (!(await isProductsTableAvailable())) {
    return (
      <div className="admin-card p-10 text-center max-w-2xl mx-auto">
        <h3 style={{
          fontFamily: 'var(--font-eb-garamond)',
          fontSize: '1.5rem',
          color: 'var(--admin-on-surface)',
          marginBottom: '0.5rem',
        }}>
          Shop schema not yet installed
        </h3>
        <p style={{
          fontFamily: 'var(--font-hanken)',
          fontSize: '0.9375rem',
          color: 'var(--admin-on-surface-variant)',
        }}>
          Run <code>supabase-schema-v3.sql</code> in your Supabase SQL editor to create the
          <code> products</code> table, then return here.
        </p>
      </div>
    )
  }

  return (
    <ProductEditor
      mode="new"
      r2Configured={isR2Configured()}
      initial={{
        name: '',
        description: '',
        category: '',
        price: 0,
        sale_price: null,
        stock_status: 'in_stock',
        images: [],
        published: false,
      }}
    />
  )
}
