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

// ─── Coupons ────────────────────────────────────────────────────────────────
// No coupon is actually applied at checkout yet — components/checkout/
// PromoCode.tsx is a real, working shell (its own state/validation/a11y)
// with no backend behind it, deliberately never faking a working code. This
// is the discount math checkout would call once one exists, kept here next
// to calculateCartTotals so admin's coupon management
// (lib/admin/coupons.ts) and any future checkout integration share one
// definition of "what a coupon does to a total" — never two pricing systems.

export type CouponType = 'percentage' | 'fixed'

export interface Coupon {
  id: string
  /** Always uppercase — enforced wherever a Coupon is created/edited. */
  code: string
  type: CouponType
  /** A percent (1–100) when type is 'percentage', or a currency amount when type is 'fixed'. */
  value: number
  /** Cart must reach this payable subtotal before the coupon applies. */
  minOrderAmount?: number
  /** Caps the discount amount — only meaningful for a percentage coupon. */
  maxDiscountAmount?: number
  /** Total redemptions allowed across all customers; undefined = unlimited. */
  usageLimit?: number
  usageCount: number
  startDate: string
  /** undefined = never expires. */
  expiryDate?: string
  /** Manual on/off switch — independent of startDate/expiryDate (see
   *  lib/admin/coupons.ts's computeCouponStatus for how the three combine
   *  into the admin-facing Active/Scheduled/Expired/Disabled status). */
  enabled: boolean
  currency: string
  createdAt: string
  updatedAt: string
}

/** How much a coupon discounts a given payable subtotal (CartTotals.
 *  payableSubtotal — after per-item sale discounts, before shipping).
 *  Returns 0 when the coupon doesn't apply (below its minimum) rather than
 *  throwing, since "not eligible yet" is a normal checkout state, not an
 *  error — callers decide how to surface that. */
export function calculateCouponDiscount(coupon: Coupon, payableSubtotal: number): number {
  if (coupon.minOrderAmount && payableSubtotal < coupon.minOrderAmount) return 0

  const raw = coupon.type === 'percentage' ? (payableSubtotal * coupon.value) / 100 : coupon.value
  const capped = coupon.type === 'percentage' && coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw

  return Math.min(capped, payableSubtotal)
}
