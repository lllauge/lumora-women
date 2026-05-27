/** Client-safe constants (no server-only imports). */

export const STOCK_STATUS_OPTIONS = [
  { value: 'in_stock',     label: 'In Stock',     tone: 'success' as const },
  { value: 'low_stock',    label: 'Low Stock',    tone: 'warning' as const },
  { value: 'out_of_stock', label: 'Out of Stock', tone: 'error'   as const },
  { value: 'coming_soon',  label: 'Coming Soon',  tone: 'neutral' as const },
]

export type StockStatus = (typeof STOCK_STATUS_OPTIONS)[number]['value']
