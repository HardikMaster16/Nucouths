// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Cart/Checkout Pricing
//
// Single source of truth for cart totals math, shared by /cart and /checkout
// (and any future order-summary surface) so the two pages can never drift
// into two different pricing systems. Pure and data-source-agnostic — swap
// the shipping constants for a live rate lookup later without touching UI.
// ─────────────────────────────────────────────────────────────────────────────

import type { CartItem } from './types'

export const FREE_SHIPPING_THRESHOLD = 2999
export const STANDARD_SHIPPING_FEE = 199

export interface CartTotals {
  /** Pre-discount total — sum of each line's original (compareAtPrice ?? price) × qty. */
  originalSubtotal: number
  /** Total savings from sale items. */
  discount: number
  /** originalSubtotal − discount — the amount the free-shipping threshold applies to. */
  payableSubtotal: number
  shipping: number
  /** originalSubtotal − discount + shipping. */
  total: number
  /** How much more (payable) the cart needs to unlock free shipping; 0 once qualified. */
  amountToFreeShipping: number
}

export function calculateCartTotals(items: CartItem[]): CartTotals {
  const originalSubtotal = items.reduce(
    (sum, it) => sum + (it.compareAtPrice ?? it.price) * it.quantity,
    0
  )
  const discount = items.reduce(
    (sum, it) => sum + (it.compareAtPrice ? (it.compareAtPrice - it.price) * it.quantity : 0),
    0
  )
  const payableSubtotal = originalSubtotal - discount
  const shipping = payableSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE
  const total = originalSubtotal - discount + shipping
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - payableSubtotal, 0)

  return { originalSubtotal, discount, payableSubtotal, shipping, total, amountToFreeShipping }
}

/** Per-line discount percentage, or null when the item isn't on sale. */
export function itemDiscountPercent(item: CartItem): number | null {
  return item.compareAtPrice
    ? Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)
    : null
}

export function formatPrice(price: number, currency: string): string {
  if (currency === 'INR') return `₹${price.toLocaleString('en-IN')}`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}
