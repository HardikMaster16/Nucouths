// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Product Reads (Prisma)
//
// Server-only reads backing /products (PLP) and /products/[slug] (PDP).
// Imported only from those Server Components — never from a 'use client'
// component, so Prisma is never pulled into a browser bundle.
//
// Reuses lib/admin/products.db.ts's productWithRelations (one query: images
// + variants + category + collection, no N+1) and dbProductToDetail — the
// same, already-correct mapping the admin catalog reads through — rather
// than a second, parallel implementation that could silently drift from it.
// A ProductDetail structurally satisfies lib/types.ts's Product (it extends
// it), so the exact same mapped rows serve both the PLP's card grid and the
// PDP's full detail view.
//
// Filtering/sorting/faceting reuses lib/product-filters.ts's
// computeFilteredProducts — the exact pure algorithm getFilteredProducts
// always ran over the mock catalog, just pointed at a live database array
// instead. getFilteredProductsFromDb (below) is also what /collections,
// /collections/[slug], and /search now call.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { dbProductToDetail, productWithRelations } from '@/lib/admin/products.db'
import { computeFilteredProducts } from '@/lib/product-filters'
import type { FilterParams, FilterResult } from '@/lib/product-filters'
import type { Product, ProductDetail } from '@/lib/types'

/** The full customer catalog, one query (images/variants/category/
 *  collection all loaded via productWithRelations — no N+1), ordered to
 *  match the mock catalog's original array order (seed rows were created in
 *  that same order, so createdAt sorts them the same way) — this is what
 *  "featured" sort (source order) relies on. */
export async function getCatalogProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ include: productWithRelations, orderBy: { createdAt: 'asc' } })
  // dbProductToDetail returns a ProductDetail, which structurally satisfies
  // Product (ProductDetail extends Product) — no second, lighter mapper
  // needed just to drop the extra PDP-only fields the PLP doesn't read.
  return rows.map(dbProductToDetail)
}

/** Homepage "New In" section (app/page.tsx) — real Product.newIn rows only,
 *  newest first. No fallback padding: fewer than 4 (or zero) is returned as-
 *  is, and the caller hides the section entirely rather than filling with
 *  unrelated catalog products. Toggling Product.newIn in Admin → Products
 *  is the only thing that changes this list. */
export async function getNewInProducts(limit = 4): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { newIn: true },
    include: productWithRelations,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map(dbProductToDetail)
}

/** The exact getFilteredProducts contract (same FilterParams in, same
 *  FilterResult out), backed by the live database instead of the mock
 *  catalog. */
export async function getFilteredProductsFromDb(params: FilterParams): Promise<FilterResult> {
  const catalog = await getCatalogProducts()
  return computeFilteredProducts(catalog, params)
}

/** Single product by slug — the public identifier for /products/[slug].
 *  Returns undefined for an unknown slug; the page maps that to notFound(). */
export async function getProductDetailBySlug(slug: string): Promise<ProductDetail | undefined> {
  const product = await prisma.product.findUnique({ where: { slug }, include: productWithRelations })
  return product ? dbProductToDetail(product) : undefined
}

/** Batch lookup by id, one query (no N+1) via the same productWithRelations
 *  every other customer read here uses — no user/order/admin data is ever
 *  reachable through this. Preserves the caller's `ids` order and silently
 *  drops any id that doesn't match a real (or no longer existing) product,
 *  rather than throwing — used to resolve a guest's locally-stored
 *  wishlist ids against the real catalog (see lib/products.actions.ts). */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const rows = await prisma.product.findMany({ where: { id: { in: ids } }, include: productWithRelations })
  const byId = new Map(rows.map((row) => [row.id, dbProductToDetail(row)]))
  return ids.map((id) => byId.get(id)).filter((p): p is ProductDetail => Boolean(p))
}

/** Related products for the PDP — the current product's category and/or
 *  collection, real Prisma rows only, one query (no N+1, no second lookup
 *  per candidate). Not a recommendation engine: a plain "same
 *  category/collection, currently purchasable, excluding this product"
 *  filter, capped at `maxCount`. Returns fewer than `maxCount` (or none)
 *  rather than padding with unrelated products — the caller renders
 *  whatever comes back, or nothing at all, never a mock fallback. */
export async function getRelatedProductsFromDb(product: ProductDetail, maxCount = 4): Promise<ProductDetail[]> {
  const orConditions: Prisma.ProductWhereInput[] = []
  if (product.category) orConditions.push({ category: { slug: product.category } })
  if (product.collection) orConditions.push({ collection: { name: product.collection } })
  if (orConditions.length === 0) return []

  const rows = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      inStock: true,
      OR: orConditions,
    },
    include: productWithRelations,
    orderBy: { createdAt: 'asc' },
    take: maxCount,
  })
  return rows.map(dbProductToDetail)
}

/** Resolves the CURRENT product for a set of historical order items (Buy
 *  Again — lib/orders.actions.ts's resolveBuyAgainItemsAction), one query
 *  regardless of how many items are given. Tries each item's stored
 *  productId first (an OrderItem's own real Product.id, when recorded);
 *  items with no productId (or one that no longer matches — the product
 *  was deleted) are looked up by their stored slug instead, still against
 *  the real database, never lib/mock-data.ts or lib/product-detail-data.ts.
 *  The returned map is keyed by both a resolved product's id and its slug,
 *  so a caller holding either can look it up; an id/slug matching nothing
 *  current is simply absent. */
export async function getCurrentProductsForOrderItems(
  items: Array<{ productId: string; slug: string }>
): Promise<Map<string, ProductDetail>> {
  const ids = [...new Set(items.map((i) => i.productId).filter(Boolean))]
  const slugs = [...new Set(items.map((i) => i.slug).filter(Boolean))]
  if (ids.length === 0 && slugs.length === 0) return new Map()

  const or: Prisma.ProductWhereInput[] = []
  if (ids.length > 0) or.push({ id: { in: ids } })
  if (slugs.length > 0) or.push({ slug: { in: slugs } })

  const rows = await prisma.product.findMany({ where: { OR: or }, include: productWithRelations })

  const map = new Map<string, ProductDetail>()
  for (const row of rows) {
    const detail = dbProductToDetail(row)
    map.set(detail.id, detail)
    map.set(detail.slug, detail)
  }
  return map
}
