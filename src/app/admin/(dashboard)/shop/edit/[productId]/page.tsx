import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductEditor, { type ProductInitial } from '@/components/admin/shop-editor/ProductEditor'
import { isR2Configured } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'
import { isProductsTableAvailable, type StockStatus } from '@/lib/shop-schema'

export const metadata: Metadata = {
  title: 'Edit Product',
  robots: { index: false, follow: false },
}

type Params = Promise<{ productId: string }>

type ProductRow = {
  id: string
  name: string
  description: string | null
  category: string | null
  price: number | string
  sale_price: number | string | null
  stock_status: StockStatus
  images: string[] | null
  published: boolean
}

async function loadProduct(productId: string): Promise<ProductInitial | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, category, price, sale_price, stock_status, images, published')
    .eq('id', productId)
    .maybeSingle<ProductRow>()

  if (error || !data) return null

  return {
    id:           data.id,
    name:         data.name,
    description:  data.description ?? '',
    category:     data.category    ?? '',
    price:        Number(data.price ?? 0),
    sale_price:   data.sale_price != null ? Number(data.sale_price) : null,
    stock_status: data.stock_status,
    images:       data.images ?? [],
    published:    data.published,
  }
}

export default async function EditProductPage({ params }: { params: Params }) {
  const { productId } = await params

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseConfigured) return notFound()

  if (!(await isProductsTableAvailable())) return notFound()

  const initial = await loadProduct(productId)
  if (!initial) return notFound()

  return (
    <ProductEditor
      mode="edit"
      r2Configured={isR2Configured()}
      initial={initial}
    />
  )
}
