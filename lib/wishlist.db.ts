// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Wishlist Reads (Prisma)
//
// Server-only. Imported only from lib/wishlist.actions.ts's Server Actions
// — never from a 'use client' component, so Prisma is never pulled into a
// browser bundle.
//
// Reuses lib/admin/products.db.ts's productWithRelations/dbProductToDetail
// — the same, already-correct product mapping lib/products.db.ts's customer
// PLP/PDP reads use — so a wishlisted product renders with the exact same
// shape (images, variants, category, price) as everywhere else, not a
// second parallel mapping that could drift.
//
// WishlistItem's FKs are both ON DELETE CASCADE (see prisma/schema.prisma's
// module comment) — a deleted product's wishlist rows are removed by
// Postgres itself, so this can never encounter a dangling reference to
// handle defensively.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { dbProductToDetail, productWithRelations } from '@/lib/admin/products.db'
import type { Product } from '@/lib/types'

/** The authenticated customer's wishlisted products, newest-saved first,
 *  shaped identically to every other product list in the app. */
export async function listWishlistProducts(userId: string): Promise<Product[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { product: { include: productWithRelations } },
  })
  return rows.map((row) => dbProductToDetail(row.product))
}
