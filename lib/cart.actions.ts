'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Cart Mutations (Prisma)
//
// The real persistence behind lib/cart-context.tsx's authenticated path.
// Every export here is a Server Action reachable directly as a POST
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
//      (CartItem.@@unique([userId, variantId])) as the authoritative
//      duplicate-row guard, via upsert's atomic increment — never an
//      app-level check-then-insert that could still race under concurrent
//      requests (e.g. two tabs adding the same item at once).
//   4. Verifies the variant is currently purchasable (belongs to the given
//      product, has stock, and its product isn't marked unavailable) and
//      caps the resulting quantity at both live stock and MAX_CART_QUANTITY
//      — never trusts the client's own +/- UI limits. This is a best-effort
//      cart-level guard, not the authoritative reservation: the real,
//      race-free stock decrement still happens exactly once, atomically,
//      inside lib/orders.actions.ts's placeOrderAction — unchanged here.
//   5. Never rethrows an error it doesn't recognize — an unexpected
//      failure (e.g. a raw Prisma error) is logged server-side and replaced
//      with a generic, safe message before reaching the customer.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireCustomerSession } from '@/lib/auth/customer-auth.actions'
import { cartItemWithRelations, dbCartItemToCartItem, listCartItems } from './cart.db'
import type { CartItem } from '@/lib/types'

/** No storefront cart legitimately needs more than this of one variant —
 *  well above any real customer's use case, so this only ever rejects
 *  abusive/malformed input, never a genuine order. */
const MAX_CART_QUANTITY = 99

function assertValidQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) {
    throw new Error(`Quantity must be a whole number between 1 and ${MAX_CART_QUANTITY}.`)
  }
}

/** The signed-in customer's cart. Throws if not signed in — callers
 *  (lib/cart-context.tsx) only call this once a customer session is known
 *  to exist. */
export async function listCartAction(): Promise<CartItem[]> {
  const user = await requireCustomerSession()
  return listCartItems(user.id)
}

/** Adds a variant to the cart, or increments its quantity if it's already
 *  there — a single atomic upsert (`update: { quantity: { increment } }`),
 *  never a separate read-then-write that could race. Validates that
 *  `variantId` is a real variant AND belongs to `productId` (rejects a
 *  mismatched pair, e.g. a stale/tampered client state), that it's currently
 *  purchasable, and that `quantity` is a whole number ≥ 1. The increment
 *  itself stays a single atomic statement (no lost updates under
 *  concurrent adds); the stock/MAX_CART_QUANTITY cap is applied as a
 *  follow-up clamp afterward, which is safe precisely because it's
 *  idempotent and never the thing guarding against overselling — that
 *  guarantee lives solely in placeOrderAction's atomic decrement. */
export async function addToCartAction(productId: string, variantId: string, quantity: number): Promise<CartItem> {
  const user = await requireCustomerSession()
  assertValidQuantity(quantity)

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, stock: true, product: { select: { inStock: true } } },
  })
  if (!variant) throw new Error('This item is no longer available.')
  if (variant.productId !== productId) throw new Error('This item is no longer available.')
  if (!variant.product.inStock || variant.stock <= 0) throw new Error('This item is currently out of stock.')

  try {
    const row = await prisma.cartItem.upsert({
      where: { userId_variantId: { userId: user.id, variantId } },
      create: { userId: user.id, variantId, quantity },
      update: { quantity: { increment: quantity } },
      include: cartItemWithRelations,
    })

    const cap = Math.min(variant.stock, MAX_CART_QUANTITY)
    if (row.quantity <= cap) return dbCartItemToCartItem(row)

    const clamped = await prisma.cartItem.update({
      where: { userId_variantId: { userId: user.id, variantId } },
      data: { quantity: cap },
      include: cartItemWithRelations,
    })
    return dbCartItemToCartItem(clamped)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2025')) {
      throw new Error('This item is no longer available.')
    }
    console.error('[addToCartAction] unexpected failure', err)
    throw new Error('Could not add to cart.')
  }
}

/** Sets a cart line's quantity to an absolute value (not a delta) — the
 *  same "SET, not read-then-modify-write" semantics
 *  lib/admin/inventory.actions.ts's stock editor uses, for the same reason:
 *  race-free by construction, since the new value never depends on reading
 *  the old one first. The stock/inStock lookup below only ever narrows the
 *  value being set (never widens it), so reading it first introduces no
 *  overselling race — that guarantee still lives solely in
 *  placeOrderAction's atomic decrement, untouched here. */
export async function updateCartItemQuantityAction(variantId: string, quantity: number): Promise<CartItem> {
  const user = await requireCustomerSession()
  assertValidQuantity(quantity)

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, product: { select: { inStock: true } } },
  })
  if (!variant || !variant.product.inStock || variant.stock <= 0) {
    throw new Error('This item is currently out of stock.')
  }
  const cappedQuantity = Math.min(quantity, variant.stock, MAX_CART_QUANTITY)

  try {
    const row = await prisma.cartItem.update({
      where: { userId_variantId: { userId: user.id, variantId } },
      data: { quantity: cappedQuantity },
      include: cartItemWithRelations,
    })
    return dbCartItemToCartItem(row)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('This item is no longer in your cart.')
    }
    console.error('[updateCartItemQuantityAction] unexpected failure', err)
    throw new Error('Could not update quantity.')
  }
}

/** Idempotent remove — deleteMany (not a unique-key delete) never throws if
 *  the row is already gone, and scoping by userId here (not just
 *  variantId) is what makes it impossible to remove another customer's
 *  cart line even if their variantId were somehow guessed. Wrapped the same
 *  way as the mutations above so a genuine failure (e.g. a DB outage) never
 *  reaches the customer as a raw error either. */
export async function removeFromCartAction(variantId: string): Promise<{ ok: true }> {
  const user = await requireCustomerSession()
  try {
    await prisma.cartItem.deleteMany({ where: { userId: user.id, variantId } })
    return { ok: true }
  } catch (err) {
    console.error('[removeFromCartAction] unexpected failure', err)
    throw new Error('Could not remove this item. Please try again.')
  }
}

/** Empties the authenticated customer's cart — mirrors
 *  lib/cart-context.tsx's clearCart(), used once an order has been placed.
 *  Not wired to any order-creation flow yet (out of scope), but provided so
 *  the context's public clearCart() contract works identically for a
 *  signed-in customer. */
export async function clearCartAction(): Promise<{ ok: true }> {
  const user = await requireCustomerSession()
  try {
    await prisma.cartItem.deleteMany({ where: { userId: user.id } })
    return { ok: true }
  } catch (err) {
    console.error('[clearCartAction] unexpected failure', err)
    throw new Error('Could not clear your cart. Please try again.')
  }
}
