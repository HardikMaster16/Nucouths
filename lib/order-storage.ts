// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Placed Order Handoff
//
// There's no backend/order database yet, so the just-placed order is handed
// from /checkout to /order-success via sessionStorage (survives the
// navigation, clears itself once read so a stale order can't reappear).
// Swap this for a real order-lookup-by-id API when a backend exists — the
// PlacedOrder shape can stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import type { CartItem, ContactInfo, PaymentMethod, ShippingAddress } from './types'
import type { CartTotals } from './cart-pricing'

const ORDER_STORAGE_KEY = 'nucouths-last-order'

export interface PlacedOrder {
  orderNumber: string
  placedAt: string
  items: CartItem[]
  totals: CartTotals
  currency: string
  contact: ContactInfo
  shippingAddress: ShippingAddress
  paymentMethod: PaymentMethod
}

export function generateOrderNumber(): string {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `NCT-${time}${rand}`
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
