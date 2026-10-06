// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Placed Order Handoff
//
// The just-placed order is handed from /checkout to /order-success via
// sessionStorage (survives the navigation, clears itself once read so a
// stale order can't reappear) — a one-shot confirmation-page handoff, not a
// data store. Real orders are Prisma rows (lib/orders.actions.ts's
// placeOrderAction creates them); this only carries that same server-
// verified data across the one client-side navigation.
//
// The customer-facing order history (/account, /account/orders,
// /account/orders/[id]) now reads real Orders straight from Prisma —
// lib/orders.db.ts + lib/orders.actions.ts's getMyOrdersAction/
// getMyOrderAction, both scoped by requireCustomerSession()'s userId — not
// this file. lib/services/mock-order-service.ts (which used to back those
// pages) is no longer wired into the live app; it stays in place only
// because prisma/seed.ts still reuses its DEMO_SEED_ORDERS/getOrdersForUser
// as the source for the demo account's seeded Order rows.
// ─────────────────────────────────────────────────────────────────────────────

import type { CartItem, ContactInfo, OrderPaymentStatus, OrderStatus, PaymentMethod, ShippingAddress } from './types'
import type { CartTotals } from './cart-pricing'

const ORDER_STORAGE_KEY = 'nucouths-last-order'

export interface PlacedOrder {
  orderNumber: string
  placedAt: string
  status: OrderStatus
  /** Owning customer's id at the moment of purchase, or null for a guest
   *  checkout (guest orders never appear in any account's order history). */
  userId: string | null
  items: CartItem[]
  totals: CartTotals
  currency: string
  contact: ContactInfo
  shippingAddress: ShippingAddress
  paymentMethod: PaymentMethod
  /** Only ever set by seed/demo data (lib/admin/mock-data.ts, lib/services/
   *  mock-order-service.ts) so prisma/seed.ts can seed an explicit,
   *  intentional payment state instead of relying on Order.paymentStatus's
   *  schema default (see prisma/migrations/20260922112604_.../migration.sql
   *  and scripts/repair-legacy-order-payment-status.ts for why that default
   *  was never safe to leave un-reviewed). The real /checkout →
   *  /order-success handoff never sets these — a real order's authoritative
   *  payment state always lives in Prisma (lib/orders.db.ts), never here. */
  paymentStatus?: OrderPaymentStatus
  paidAt?: string | null
}

/** Prefixes every newly-generated order number. Exposed so /admin/settings
 *  can display the real value instead of a second, invented one — note the
 *  seeded demo orders (lib/admin/mock-data.ts, lib/services/mock-order-
 *  service.ts) predate this constant and use their own 'NUC-' numbers;
 *  only orders placed from here on use this prefix. */
export const ORDER_NUMBER_PREFIX = 'NCT'

export function generateOrderNumber(): string {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${ORDER_NUMBER_PREFIX}-${time}${rand}`
}

export function savePlacedOrder(order: PlacedOrder): void {
  try {
    window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))
  } catch {
    // storage unavailable — the success page will fall back to its empty state
  }
}

/** Reads the last placed order for /order-success. Non-destructive, so
 *  refreshing the confirmation page still shows it for this browser tab. */
export function getPlacedOrder(): PlacedOrder | null {
  try {
    const raw = window.sessionStorage.getItem(ORDER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PlacedOrder) : null
  } catch {
    return null
  }
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Credit / Debit Card',
  netbanking: 'Net Banking',
  cod: 'Cash on Delivery',
}
