'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { inferExtension, isR2Configured, uploadFileToR2 } from '@/lib/r2'
import { getVerifiedAdminUser } from '@/lib/admin-guard'

// ─── Save product ─────────────────────────────────────────────────────────────

const productSchema = z.object({
  id:           z.string().uuid().optional(),
  name:         z.string().min(1, 'Name is required').max(255),
  description:  z.string().max(10000).nullable().optional().default(null),
  category:     z.string().max(120).nullable().optional().default(null),
  price:        z.number().min(0).max(100000),
  sale_price:   z.number().min(0).max(100000).nullable().optional().default(null),
  stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'coming_soon']),
  images:       z.array(z.string().min(1).max(2048)).default([]),
})

export type ProductDraft = z.infer<typeof productSchema>

type SaveResult =
  | { ok: true;  productId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function saveProduct(
  rawDraft: unknown,
  options: { publish: boolean }
): Promise<SaveResult> {
  try { await getVerifiedAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }

  const parsed = productSchema.safeParse(rawDraft)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }
  const draft = parsed.data
  const supabase = await createClient()

  const payload = {
    name:         draft.name.trim(),
    description:  draft.description?.trim() || null,
    category:     draft.category?.trim()    || null,
    price:        draft.price,
    sale_price:   draft.sale_price ?? null,
    stock_status: draft.stock_status,
    images:       draft.images.filter((u) => u.trim().length > 0),
    published:    options.publish,
  }

  let productId: string
  if (draft.id) {
    const { error } = await supabase.from('products').update(payload).eq('id', draft.id)
    if (error) return { ok: false, error: `Could not update product: ${error.message}` }
    productId = draft.id
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: `Could not create product: ${error?.message ?? 'unknown'}` }
    productId = data.id
  }

  revalidatePath('/admin/shop')
  revalidatePath(`/admin/shop/edit/${productId}`)
  revalidatePath('/shop')
  return { ok: true, productId }
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function archiveProduct(formData: FormData) {
  try { await getVerifiedAdminUser() } catch { return { ok: false, error: 'Unauthorized.' } }

  const id = (formData.get('id') ?? '').toString().trim()
  if (!id) return { ok: false, error: 'Missing product id.' }

  const supabase = await createClient()
  const { error } = await supabase.from('products').update({ published: false }).eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/shop')
  revalidatePath('/shop')
  return { ok: true }
}

// ─── Image upload ─────────────────────────────────────────────────────────────

export type UploadProductImageResult =
  | { ok: true;  url: string; name: string }
  | { ok: false; error: string; r2Configured: boolean }

export async function uploadProductImage(formData: FormData): Promise<UploadProductImageResult> {
  try { await getVerifiedAdminUser() } catch {
    return { ok: false, error: 'Unauthorized.', r2Configured: isR2Configured() }
  }

  const file      = formData.get('file')
  const productId = (formData.get('productId') ?? '').toString() || 'unfiled'

  if (!(file instanceof File))      return { ok: false, error: 'No file received.',         r2Configured: isR2Configured() }
  if (file.size === 0)              return { ok: false, error: 'File is empty.',           r2Configured: isR2Configured() }
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: 'Image too large (20 MB).',  r2Configured: isR2Configured() }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Product images must be JPG, PNG, or WEBP.', r2Configured: isR2Configured() }
  }

  const ext = inferExtension(file)
  const key = `shop/${productId}/${randomUUID()}.${ext}`
  const result = await uploadFileToR2(file, key)
  if (!result.ok) return { ok: false, error: result.error, r2Configured: isR2Configured() }

  return { ok: true, url: result.url, name: file.name }
}
