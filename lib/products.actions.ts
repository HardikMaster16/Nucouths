'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Public Product Lookup (Server Action)
//
// The one Server Action a 'use client' component may call to resolve
// product ids against the real Prisma catalog without a customer session —
// every field returned is already public storefront data (the same shape
// /products, /collections, and /search already return to anyone), so no
// authentication or per-user scoping applies here.
//
// Used by components/wishlist/WishlistClient.tsx to resolve a GUEST's
// locally-stored wishlist ids. A signed-in customer's wishlist is resolved
// server-side instead, by lib/wishlist.actions.ts's
// listWishlistProductsAction (which IS session-gated) — this file is never
// used for that path.
//
// Reuses lib/products.db.ts's getProductsByIds — itself built on the same
// productWithRelations (images/variants/category/collection) every other
// customer product read uses — so no User, Order, Coupon, or admin-only
// field is ever reachable through this.
// ─────────────────────────────────────────────────────────────────────────────

import { getProductsByIds } from './products.db'
import type { Product } from './types'

/** Reachable without a session, so the input is capped and deduplicated
 *  before ever reaching the database — a guest's own wishlist is the only
 *  real caller, and it never grows anywhere near this size. */
const MAX_IDS = 200

/** Resolves an arbitrary, client-supplied list of product ids against the
 *  real catalog. Order is preserved (the caller's save order); any id that
 *  doesn't match a real product — never existed, or was since deleted — is
 *  silently dropped rather than causing an error. */
export async function getProductsByIdsAction(ids: string[]): Promise<Product[]> {
  const cleaned = [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(
    0,
    MAX_IDS
  )
  if (cleaned.length === 0) return []
  return getProductsByIds(cleaned)
}
