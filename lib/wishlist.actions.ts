'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Wishlist Mutations (Prisma)
//
// The real persistence behind lib/wishlist-context.tsx's authenticated
// path. Every export here is a Server Action reachable directly as a POST
// endpoint, so each one:
//
//   1. Calls requireCustomerSession() first, unconditionally — the ONLY
//      source of customer identity. A client-supplied userId is never
//      accepted; every query below is scoped by the session's own user.id,
//      never by anything the caller passed in.
//   2. Scopes every read/write by that userId, so cross-user access is
//      structurally impossible (a WHERE clause that can't match another
//      customer's rows), not merely checked with an if-statement.
//   3. Uses the database's own unique constraint
//      (WishlistItem.@@unique([userId, productId])) as the authoritative
//      duplicate-add guard, via upsert's atomic "insert or no-op" — not an
//      app-level check-then-insert that could still race.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireCustomerSession } from '@/lib/auth/customer-auth.actions'
import { listWishlistProducts } from './wishlist.db'
import type { Product } from '@/lib/types'

/** The signed-in customer's wishlisted products. Throws if not signed in —
 *  callers (lib/wishlist-context.tsx) only call this once a customer
 *  session is known to exist. */
export async function listWishlistProductsAction(): Promise<Product[]> {
  const user = await requireCustomerSession()
  return listWishlistProducts(user.id)
}

/** Idempotent add — upsert's `update: {}` is the duplicate-add guard: a
 *  second add for the same product is a silent no-op, not an error. Fails
 *  safely (a clear error, not a crash) if productId doesn't correspond to a
 *  real Product row — e.g. a not-yet-migrated storefront page passing a
 *  mock catalog id — since the foreign key rejects it. */
export async function addToWishlistAction(productId: string): Promise<{ ok: true }> {
  const user = await requireCustomerSession()

  try {
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: {},
      create: { userId: user.id, productId },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2025')) {
      throw new Error('This product is no longer available.')
    }
    throw err instanceof Error ? err : new Error('Could not add to wishlist.')
  }

  return { ok: true }
}

/** Idempotent remove — deleteMany (not a unique-key delete) never throws if
 *  the row is already gone, and scoping by userId here (not just
 *  productId) is what makes it impossible to remove another customer's
 *  wishlist entry even if their productId were somehow guessed. */
export async function removeFromWishlistAction(productId: string): Promise<{ ok: true }> {
  const user = await requireCustomerSession()
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } })
  return { ok: true }
}
