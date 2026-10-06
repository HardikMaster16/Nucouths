// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Inventory Reads (Prisma)
//
// Server-only reads backing /admin/inventory. Imported only from
// app/admin/(dashboard)/inventory/page.tsx (a Server Component) and from
// lib/admin/inventory.actions.ts's Server Action — never from a 'use
// client' component, so Prisma is never pulled into a browser bundle.
//
// ProductVariant.stock is the single source of truth for stock — this file
// only ever reads it, never a second, separately-tracked value. One row per
// ProductVariant (not per Product), joined to its Product for the display
// fields (name, slug, category, price/currency) the existing InventoryRow
// shape already carries — see lib/admin/inventory.ts's InventoryRow type,
// reused as-is (imported, not redefined) so the UI needs no changes.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/cart-pricing'
import { variantStockState } from '@/lib/product-detail-data'
import { categoryLabel } from './products'
import { requireAdminSession } from './auth/admin-session.actions'
import type { InventoryRow } from './inventory'

export const variantWithProduct = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      currency: true,
      category: { select: { slug: true } },
    },
  },
} satisfies Prisma.ProductVariantInclude

export type VariantWithProduct = Prisma.ProductVariantGetPayload<{ include: typeof variantWithProduct }>

export function variantToInventoryRow(v: VariantWithProduct): InventoryRow {
  const categorySlug = v.product.category?.slug ?? ''
  const price = Number(v.priceOverride ?? v.product.price)

  return {
    productId: v.productId,
    productName: v.product.name,
    productSlug: v.product.slug,
    category: categorySlug,
    categoryLabel: categoryLabel(categorySlug),
    variantId: v.id,
    sku: v.sku,
    color: v.color,
    colorHex: v.colorHex,
    size: v.size,
    price,
    priceFormatted: formatPrice(price, v.product.currency),
    currency: v.product.currency,
    stock: v.stock,
    stockState: variantStockState(v.stock),
  }
}

/** All variants across the catalog, shaped for the inventory table — one row
 *  per (product × variant), the real unit lib/types.ts's ProductVariant
 *  already represents. Requires an admin session —
 *  app/admin/(dashboard)/inventory/page.tsx has no guard of its own (the
 *  client-side AdminShell redirect doesn't stop a Server Component's data
 *  fetch from running or reaching the RSC payload — see Next.js's own
 *  authentication guide), so the check happens here, right at the data
 *  source. */
export async function listInventoryRows(): Promise<InventoryRow[]> {
  await requireAdminSession()
  const variants = await prisma.productVariant.findMany({
    include: variantWithProduct,
    orderBy: [{ product: { name: 'asc' } }, { createdAt: 'asc' }],
  })
  return variants.map(variantToInventoryRow)
}
