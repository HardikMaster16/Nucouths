// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Mock Order Service
//
// ⚠️ TEMPORARY DEVELOPMENT DATA. There's no order database yet, so this
// module combines two sources into one "GET /api/orders" style read:
//
//   1. A small set of fictional seed orders for the demo account
//      (demo-user-001) — realistic order history to test /account/orders
//      and /account/orders/[id] without first placing a real order.
//   2. lib/order-storage.ts's single last-placed-order sessionStorage handoff
//      (unchanged — still what /checkout → /order-success uses), included
//      only when it belongs to the requesting userId.
//
// Every lookup is filtered by the authenticated userId the caller passes in
// (see components/account/*.tsx, which get it from useAuth(), never from the
// URL) — an order id alone is never enough to see an order. Swap this file's
// body for a real API call when a backend exists; getOrdersForUser /
// getOrderForUser's signatures can stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import { getPlacedOrder } from '@/lib/order-storage'
import type { PlacedOrder } from '@/lib/order-storage'
import { getProductDetail, findVariant } from '@/lib/product-detail-data'
import { calculateCartTotals } from '@/lib/cart-pricing'
import { DEMO_USER, DEMO_USER_ID } from '@/lib/auth/mock-auth-service'
import type { CartItem, ShippingAddress } from '@/lib/types'

function buildItem(slug: string, color: string, size: string, quantity: number): CartItem {
  const product = getProductDetail(slug)
  const variant = product ? findVariant(product.variants, color, size) : undefined
  if (!product || !variant) {
    throw new Error(`mock-order-service: unknown product/variant for seed order (${slug} ${color} ${size})`)
  }
  return {
    productId: product.id,
    variantId: variant.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    color: variant.color,
    size: variant.size,
    quantity,
    price: variant.priceOverride ?? product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    image: product.images[0],
  }
}

// Fictional address — same one seeded in lib/services/mock-address-service.ts.
const DEMO_SHIPPING_ADDRESS: ShippingAddress = {
  firstName: DEMO_USER.firstName,
  lastName: DEMO_USER.lastName,
  address: '12, Sunrise Residency, Ghod Dod Road',
  city: 'Surat',
  state: 'Gujarat',
  pinCode: '395007',
  country: 'India',
  phone: DEMO_USER.phone,
}

const order1Items = [
  buildItem('merino-ribbed-turtleneck', 'Navy', 'M', 1),
  buildItem('oversized-cotton-shirt', 'White', 'S', 1),
]
const order2Items = [buildItem('structured-wool-blazer', 'Camel', 'M', 1)]

/** Fictional demo order history for demo-user-001 only — never a real
 *  customer's data. */
const DEMO_SEED_ORDERS: PlacedOrder[] = [
  {
    orderNumber: 'NUC-10001',
    placedAt: '2026-08-20T10:30:00.000Z',
    status: 'Delivered',
    userId: DEMO_USER_ID,
    items: order1Items,
    totals: calculateCartTotals(order1Items),
    currency: 'INR',
    contact: { email: DEMO_USER.email, phone: DEMO_USER.phone },
    shippingAddress: DEMO_SHIPPING_ADDRESS,
    paymentMethod: 'upi',
    // Delivered — this app's real flow can't reach that fulfillment stage
    // on a non-COD order without payment, so this seed explicitly
    // represents a completed sale (see scripts/repair-legacy-order-
    // payment-status.ts, which corrected the already-seeded row to match).
    paymentStatus: 'Paid',
    paidAt: '2026-08-20T10:30:00.000Z',
  },
  {
    orderNumber: 'NUC-10002',
    placedAt: '2026-09-10T15:45:00.000Z',
    status: 'Shipped',
    userId: DEMO_USER_ID,
    items: order2Items,
    totals: calculateCartTotals(order2Items),
    currency: 'INR',
    contact: { email: DEMO_USER.email, phone: DEMO_USER.phone },
    shippingAddress: DEMO_SHIPPING_ADDRESS,
    paymentMethod: 'card',
    // Shipped — same reasoning as NUC-10001 above.
    paymentStatus: 'Paid',
    paidAt: '2026-09-10T15:45:00.000Z',
  },
]

/** All of the given customer's orders, newest first. Ownership is enforced
 *  here (filtered by userId), not left to the caller. */
export function getOrdersForUser(userId: string): PlacedOrder[] {
  const seeded = DEMO_SEED_ORDERS.filter((o) => o.userId === userId)

  const last = getPlacedOrder()
  const lastBelongsToUser = last && last.userId === userId
  const alreadyIncluded = last && seeded.some((o) => o.orderNumber === last.orderNumber)
  const all = lastBelongsToUser && !alreadyIncluded ? [...seeded, last] : seeded

  return [...all].sort((a, b) => b.placedAt.localeCompare(a.placedAt))
}

/** Looks up one order by number, scoped to the given userId — an order
 *  number from the URL is never sufficient on its own; a mismatch (wrong
 *  owner or unknown id) returns null exactly like "doesn't exist" so a
 *  probing customer can't tell the two apart. */
export function getOrderForUser(userId: string, orderNumber: string): PlacedOrder | null {
  return getOrdersForUser(userId).find((o) => o.orderNumber === orderNumber) ?? null
}
