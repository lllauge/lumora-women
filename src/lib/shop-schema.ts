import { createClient } from '@/lib/supabase/server'

export { STOCK_STATUS_OPTIONS, type StockStatus } from './shop-constants'

let cached: { value: boolean; expires: number } | null = null
const CACHE_MS = 60_000

/** Returns true if the v3 `products` table exists. */
export async function isProductsTableAvailable(): Promise<boolean> {
  if (cached && cached.expires > Date.now()) return cached.value

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .limit(0)

  const ok = !error
  cached = { value: ok, expires: Date.now() + CACHE_MS }
  return ok
}
