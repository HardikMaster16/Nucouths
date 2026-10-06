// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Customer Service
//
// The one place the /admin/customers UI reads customer data through. Wraps
// the same store-wide fictional roster lib/admin/dashboard.ts already uses
// for its customerCount KPI (lib/admin/mock-data.ts's ADMIN_MOCK_CUSTOMERS)
// — never a parallel "AdminCustomer" model, and never the storefront's own
// single demo account (lib/auth/mock-auth-service.ts's DEMO_USER, which has
// no order history of its own to aggregate). Orders and Total Spent are
// derived live from the same ADMIN_MOCK_ORDERS the Orders page reads,
// filtered by userId — never a second, separately-counted total.
//
// Swap this file's internals for real API/database calls when a backend
// exists; its exported function signatures are the contract the UI depends
// on, so nothing above this layer needs to change:
//
//   Admin UI → this service → (today) mock data → (later) API → database
// ─────────────────────────────────────────────────────────────────────────────

import { ADMIN_CUSTOMER_JOINED_AT, ADMIN_CUSTOMER_STATUS, ADMIN_MOCK_CUSTOMERS, ADMIN_MOCK_ORDERS } from './mock-data'
import { formatUpdatedAt } from './products'
import { formatPrice } from '@/lib/cart-pricing'
import type { AdminCustomerSeed } from './mock-data'
import type { PlacedOrder } from '@/lib/order-storage'
import type { OrderStatus, ShippingAddress } from '@/lib/types'

export type CustomerStatus = 'Active' | 'Inactive'

export interface AdminCustomerRow {
  id: string
  name: string
  email: string
  orderCount: number
  totalSpent: number
  totalSpentFormatted: string
  joinedAt: string
  joinedAtFormatted: string
  status: CustomerStatus
}

/** A cancelled order was never fulfilled/paid, so it doesn't count toward
 *  "Total Spent" — same rule lib/admin/dashboard.ts's isRevenueOrder and
 *  lib/admin/orders.ts's countsAsSale already apply to sales reporting,
 *  reused here rather than redefined. Order *count* is unfiltered — a
 *  cancelled order still happened. */
function isRevenueOrder(order: PlacedOrder): boolean {
  return order.status !== 'Cancelled'
}

function ordersFor(customerId: string): PlacedOrder[] {
  return ADMIN_MOCK_ORDERS.filter((o) => o.userId === customerId)
}

function toAdminRow(customer: AdminCustomerSeed): AdminCustomerRow {
  const orders = ordersFor(customer.id)
  const totalSpent = orders.filter(isRevenueOrder).reduce((sum, o) => sum + o.totals.total, 0)
  const joinedAt = ADMIN_CUSTOMER_JOINED_AT[customer.id] ?? new Date(0).toISOString()

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    orderCount: orders.length,
    totalSpent,
    totalSpentFormatted: formatPrice(totalSpent, 'INR'),
    joinedAt,
    joinedAtFormatted: formatUpdatedAt(joinedAt),
    status: ADMIN_CUSTOMER_STATUS[customer.id] ?? 'Active',
  }
}

/** All store-wide customers, shaped for the admin listing. */
export function getAdminCustomers(): AdminCustomerRow[] {
  return ADMIN_MOCK_CUSTOMERS.map(toAdminRow)
}

// ─── Customer detail (order history, address) ───────────────────────────────
// The list row above is a summary; the detail page additionally needs each
// order line (for the Order History table) and a phone/shipping address —
// neither of which AdminCustomerSeed carries itself. Both are read off the
// customer's own orders (PlacedOrder.contact / .shippingAddress), same as
// lib/admin/orders.ts's order detail already does for the reverse lookup —
// never invented, and never a second "saved address" concept: this mock
// system's only real saved-address store
// (lib/services/mock-address-service.ts) is scoped to the single storefront
// demo account, not this store-wide fictional roster.

export interface AdminCustomerOrderRow {
  orderNumber: string
  placedAt: string
  placedAtFormatted: string
  itemCount: number
  total: number
  totalFormatted: string
  status: OrderStatus
  /** Mirrors lib/admin/orders.ts's AdminOrderRow.countsAsSale. */
  countsAsSale: boolean
}

export interface AdminCustomerDetail extends AdminCustomerRow {
  /** From the customer's most recent order's contact info — undefined if
   *  they have no orders on record. */
  phone: string | undefined
  averageOrderValue: number
  averageOrderValueFormatted: string
  lastOrderAt: string | undefined
  lastOrderAtFormatted: string | undefined
  /** The shipping address from the customer's most recent order, when one
   *  exists — this mock system has no separate "saved address book" for the
   *  admin's fictional customer roster (see above), so this is genuine order
   *  data, not invented. */
  shippingAddress: ShippingAddress | undefined
  /** Newest first. */
  orders: AdminCustomerOrderRow[]
}

function toCustomerOrderRow(order: PlacedOrder): AdminCustomerOrderRow {
  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt,
    placedAtFormatted: formatUpdatedAt(order.placedAt),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.totals.total,
    totalFormatted: formatPrice(order.totals.total, order.currency),
    status: order.status,
    countsAsSale: isRevenueOrder(order),
  }
}

/** Full customer detail, for the admin customer detail page — everything
 *  the list row omits (phone, address, full order history). */
export function getAdminCustomerDetail(id: string): AdminCustomerDetail | undefined {
  const customer = ADMIN_MOCK_CUSTOMERS.find((c) => c.id === id)
  if (!customer) return undefined

  const row = toAdminRow(customer)
  const orders = ordersFor(customer.id).sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  const revenueOrders = orders.filter(isRevenueOrder)
  const averageOrderValue = revenueOrders.length > 0 ? row.totalSpent / revenueOrders.length : 0
  const mostRecent = orders[0] as PlacedOrder | undefined

  return {
    ...row,
    phone: mostRecent?.contact.phone,
    averageOrderValue,
    averageOrderValueFormatted: formatPrice(averageOrderValue, 'INR'),
    lastOrderAt: mostRecent?.placedAt,
    lastOrderAtFormatted: mostRecent ? formatUpdatedAt(mostRecent.placedAt) : undefined,
    shippingAddress: mostRecent?.shippingAddress,
    orders: orders.map(toCustomerOrderRow),
  }
}
