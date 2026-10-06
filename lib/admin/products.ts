// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Product Row Shape + Shared Helpers
//
// Prisma is the single source of truth for admin products (see
// lib/admin/products.db.ts / lib/admin/products.actions.ts) — this file no
// longer builds listing rows itself. What's left is shared by the Prisma
// reads and the rest of the admin tree:
//   - AdminProductRow / AdminProductStatus — the row shape products.db.ts,
//     inventory.db.ts, and taxonomy.ts/taxonomy.db.ts all build toward.
//   - categoryLabel / formatUpdatedAt — pure formatting, reused everywhere
//     a category slug or timestamp needs to render the same way.
//   - isSeedSlugTaken — the seed catalog's contribution to the Add/Edit
//     Product form's instant, best-effort client-side slug check (see
//     lib/admin/product-form.ts's isSlugTaken); the authoritative check is
//     server-side, against the real database.
// ─────────────────────────────────────────────────────────────────────────────

import { products } from '@/lib/mock-data'
import type { ProductImage, StockState } from '@/lib/types'

export type AdminProductStatus = 'Active' | 'Inactive'

export interface AdminProductRow {
  id: string
  slug: string
  name: string
  image: ProductImage
  category: string
  categoryLabel: string
  price: number
  priceFormatted: string
  currency: string
  sku: string
  variantCount: number
  totalStock: number
  stockState: StockState
  status: AdminProductStatus
  updatedAt: string
  updatedAtFormatted: string
}

export function categoryLabel(category: string): string {
  return category.length > 0 ? category[0].toUpperCase() + category.slice(1) : category
}

export function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** True if `slug` is already used by a seed catalog product (optionally
 *  excluding one id). Only the instant, client-side pre-check — see the
 *  module docstring above. */
export function isSeedSlugTaken(slug: string, excludeId?: string): boolean {
  return products.some((p) => p.slug === slug && p.id !== excludeId)
}
