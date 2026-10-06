// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Checkout Data (Prisma, server-only)
//
// The single server-side resolver /checkout reads through. Derives the
// customer exclusively from requireCustomerSession() (lib/auth/customer-
// auth.actions.ts) — never from anything the client sends — then reuses the
// already-migrated Cart (lib/cart.db.ts) and Address (lib/addresses.db.ts)
// readers rather than re-querying the same data a second way.
//
// `items`/`serverTotals` below are the AUTHORITATIVE values: items are
// re-filtered here against each variant's live stock + its product's
// inStock flag (a cart row surviving a deleted variant/product is already
// structurally impossible — CartItem's FKs are ON DELETE CASCADE, see
// lib/cart.db.ts — but a product can be soft-marked unavailable/out of
// stock without being deleted, which cascade delete doesn't cover), and
// serverTotals is computed from that filtered set via lib/cart-pricing.ts's
// existing calculateCartTotals — the exact same math /cart already uses,
// never a second pricing implementation. Nothing here ever reads a
// client-supplied price, subtotal, or total.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { requireCustomerSession } from './auth/customer-auth.actions'
import { listCartItems } from './cart.db'
import { listAddressesForUser } from './addresses.db'
import { calculateCartTotals } from './cart-pricing'
import type { CartItem } from './types'
import type { CartTotals } from './cart-pricing'
import type { Address } from './types'

/** Explicitly named apart from any per-line "display" field so it's obvious
 *  in code — not just in a comment — that this is the value checkout must
 *  treat as truth, never something echoed back from the browser. */
export type ServerCalculatedTotals = CartTotals

export interface CheckoutData {
  customerId: string
  /** Available, purchasable lines — what serverTotals is computed from and
   *  what the (still-mock) "Place Order" step should snapshot. */
  items: CartItem[]
  /** Cart lines whose variant is out of stock or whose product has been
   *  marked unavailable since being added — excluded from serverTotals,
   *  shown separately so the UI can tell the customer why. */
  unavailableItems: CartItem[]
  serverTotals: ServerCalculatedTotals
  currency: string
  addresses: Address[]
  defaultAddressId: string | undefined
  isEmpty: boolean
}

/** Splits live cart lines into purchasable vs. unavailable by re-checking
 *  each variant's current stock (against the cart line's own quantity, not
 *  just "greater than zero" — a line whose quantity now exceeds live stock
 *  is unavailable AS ORDERED, since lib/orders.actions.ts's placeOrderAction
 *  applies the identical stock >= quantity rule and would otherwise reject
 *  the whole order over this one line) and its product's inStock flag — a
 *  second, cheap query (not exposed by lib/cart.db.ts's CartItem shape)
 *  rather than widening that shared file for this one caller. */
async function partitionByAvailability(items: CartItem[]): Promise<{ available: CartItem[]; unavailable: CartItem[] }> {
  if (items.length === 0) return { available: [], unavailable: [] }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((item) => item.variantId) } },
    select: { id: true, stock: true, product: { select: { inStock: true } } },
  })
  const stockById = new Map(variants.map((v) => [v.id, v]))

  const isAvailable = (item: CartItem) => {
    const variant = stockById.get(item.variantId)
    return !!variant && variant.product.inStock && variant.stock >= item.quantity
  }

  return {
    available: items.filter(isAvailable),
    unavailable: items.filter((item) => !isAvailable(item)),
  }
}

/** Throws (via requireCustomerSession) when no valid customer session
 *  exists — checkout requires a signed-in customer; callers (the /checkout
 *  Server Component) should let this propagate into a redirect to /login. */
export async function getCheckoutData(): Promise<CheckoutData> {
  const customer = await requireCustomerSession()

  const [rawItems, addresses] = await Promise.all([
    listCartItems(customer.id),
    listAddressesForUser(customer.id),
  ])

  const { available: items, unavailable: unavailableItems } = await partitionByAvailability(rawItems)
  const serverTotals = calculateCartTotals(items)
  const currency = items[0]?.currency ?? rawItems[0]?.currency ?? 'INR'
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0]

  return {
    customerId: customer.id,
    items,
    unavailableItems,
    serverTotals,
    currency,
    addresses,
    defaultAddressId: defaultAddress?.id,
    isEmpty: items.length === 0,
  }
}
