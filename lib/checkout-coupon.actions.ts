'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Checkout Coupon Actions (Prisma, server-only)
//
// Server Actions behind the checkout page's "Have a promo code?" panel
// (components/checkout/PromoCode.tsx). Every export here:
//
//   1. Derives the customer exclusively from requireCustomerSession() — a
//      client-supplied userId is never accepted.
//   2. Re-derives cart items and totals via getCheckoutData() (the exact
//      same resolver /checkout itself renders from) rather than trusting
//      anything the client sends — a tampered client subtotal/discount has
//      no code path into this file at all, since the only client input
//      accepted is the coupon code string itself.
//   3. Reads the coupon from Prisma and validates it with the same rules
//      lib/admin/coupon-form.ts's computeCouponStatus and
//      lib/cart-pricing.ts's calculateCouponDiscount already encode for the
//      admin UI — never a second, parallel set of coupon rules.
//   4. Never increments Coupon.usageCount — that only happens once a real
//      order is placed against the coupon (not implemented yet; see
//      lib/admin/coupons.actions.ts's docstring for the existing usage-count
//      contract), so re-validating the same code repeatedly (e.g. on every
//      checkout page load) can never itself exhaust a usage limit.
//
// "Invalid code" and "disabled code" deliberately share one generic message
// (GENERIC_COUPON_ERROR) — the same enumeration-safety pattern
// lib/auth/customer-auth.actions.ts's GENERIC_LOGIN_ERROR already uses —
// so a disabled coupon's existence is never confirmed to the caller.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { requireCustomerSession } from './auth/customer-auth.actions'
import { getCheckoutData } from './checkout.db'
import { calculateCouponDiscount, formatPrice } from './cart-pricing'
import { computeCouponStatus } from './admin/coupon-form'
import { dbCouponToCoupon } from './admin/coupons.db'
import type { CartTotals } from './cart-pricing'

export interface CouponActionResult {
  success: boolean
  error?: string
  /** Present only on success — the coupon actually applied and how much it
   *  took off, both server-derived. */
  couponCode?: string
  couponDiscount?: number
  /** Always present — the authoritative totals to render, coupon-adjusted
   *  on success (or restored to their pre-coupon values on removal/failure). */
  totals: CartTotals
}

const GENERIC_COUPON_ERROR = 'This coupon code is invalid.'

/** Applies coupon.discount to a fresh CartTotals, clamped so the payable
 *  total can never go negative (calculateCouponDiscount already caps the
 *  discount at payableSubtotal, so this is a defense-in-depth floor, not
 *  the primary guarantee). */
function applyDiscountToTotals(totals: CartTotals, discount: number): CartTotals {
  return { ...totals, total: Math.max(totals.total - discount, 0) }
}

export async function applyCouponAction(rawCode: string): Promise<CouponActionResult> {
  await requireCustomerSession()
  const { serverTotals: totals } = await getCheckoutData()

  const code = rawCode.trim().toUpperCase()
  if (!code) return { success: false, error: 'Enter a coupon code.', totals }

  const row = await prisma.coupon.findUnique({ where: { code } })
  if (!row) return { success: false, error: GENERIC_COUPON_ERROR, totals }

  const coupon = dbCouponToCoupon(row)
  const status = computeCouponStatus(coupon, Date.now())

  if (status === 'Disabled') return { success: false, error: GENERIC_COUPON_ERROR, totals }
  if (status === 'Scheduled') return { success: false, error: 'This coupon isn’t active yet.', totals }
  if (status === 'Expired') return { success: false, error: 'This coupon has expired.', totals }

  if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
    return { success: false, error: 'This coupon has reached its usage limit.', totals }
  }

  if (coupon.minOrderAmount && totals.payableSubtotal < coupon.minOrderAmount) {
    return {
      success: false,
      error: `Spend at least ${formatPrice(coupon.minOrderAmount, coupon.currency)} to use this coupon.`,
      totals,
    }
  }

  const couponDiscount = calculateCouponDiscount(coupon, totals.payableSubtotal)
  if (couponDiscount <= 0) return { success: false, error: GENERIC_COUPON_ERROR, totals }

  return {
    success: true,
    couponCode: coupon.code,
    couponDiscount,
    totals: applyDiscountToTotals(totals, couponDiscount),
  }
}

/** Re-derives totals fresh (never the client's cached pre-coupon numbers) so
 *  removal restores exactly what the server currently computes for this
 *  customer's cart — correct even if the cart changed while a coupon was
 *  applied. */
export async function removeCouponAction(): Promise<CouponActionResult> {
  await requireCustomerSession()
  const { serverTotals: totals } = await getCheckoutData()
  return { success: true, totals }
}
