// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Order Service
//
// The one place the /admin/orders UI reads order data through. Wraps the
// same store-wide mock order/customer set lib/admin/dashboard.ts already
// uses (lib/admin/mock-data.ts's ADMIN_MOCK_ORDERS/ADMIN_MOCK_CUSTOMERS) —
// never a parallel "AdminOrder" model or a second seed dataset. Every order
// is a real PlacedOrder (lib/order-storage.ts, the same type /checkout,
// /order-success, and /account/orders already use), and totals are read
// straight off `order.totals` (lib/cart-pricing.ts's calculateCartTotals,
// computed once when the mock order was authored) — never recalculated here.
//
// Read-only for now — there's nothing to create/edit from a list view yet.
// Swap this file's internals for real API/database calls when a backend
// exists; its exported function signatures are the contract the UI depends
// on, so nothing above this layer needs to change:
//
//   Admin UI → this service → (today) mock data → (later) API → database
// ─────────────────────────────────────────────────────────────────────────────

import { ADMIN_MOCK_CUSTOMERS, ADMIN_MOCK_ORDERS } from './mock-data'
import { formatUpdatedAt } from './products'
import { formatPrice } from '@/lib/cart-pricing'
import type { CartTotals } from '@/lib/cart-pricing'
import { PAYMENT_METHOD_LABELS } from '@/lib/order-storage'
import type { PlacedOrder } from '@/lib/order-storage'
import { getProductDetail, findVariant } from '@/lib/product-detail-data'
import type { CartItem, OrderStatus, PaymentMethod, ProductImage, ShippingAddress } from '@/lib/types'

export interface AdminOrderRow {
  orderNumber: string
  customerName: string
  customerEmail: string
  placedAt: string
  placedAtFormatted: string
  itemCount: number
  total: number
  totalFormatted: string
  currency: string
  paymentMethod: PaymentMethod
  paymentMethodLabel: string
  status: OrderStatus
  /** Mirrors lib/admin/dashboard.ts's isRevenueOrder — a cancelled order
   *  never counts toward sales. Surfaced on the row itself so the list can
   *  visually de-emphasize it without a second definition of "counts as a
   *  sale" existing anywhere. */
  countsAsSale: boolean
}

/** The order lifecycle in its natural sequence — used for the status filter
 *  dropdown. Matches components/account/OrderDetailClient.tsx's
 *  TIMELINE_STAGES plus the terminal "Cancelled" state. */
export const ALL_ORDER_STATUSES: OrderStatus[] = [
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
]

export const ALL_PAYMENT_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'cod']

/** The order lifecycle's linear progression, excluding the terminal
 *  "Cancelled" state — matches components/account/OrderDetailClient.tsx's
 *  private TIMELINE_STAGES exactly, so the admin and customer-facing status
 *  timelines never disagree about the sequence. */
export const FULFILLMENT_STAGES: OrderStatus[] = ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']

function customerNameFor(userId: string | null): string {
  return ADMIN_MOCK_CUSTOMERS.find((c) => c.id === userId)?.name ?? 'Guest'
}

function customerEmailFor(order: PlacedOrder): string {
  return ADMIN_MOCK_CUSTOMERS.find((c) => c.id === order.userId)?.email ?? order.contact.email
}

function toAdminRow(order: PlacedOrder): AdminOrderRow {
  return {
    orderNumber: order.orderNumber,
    customerName: customerNameFor(order.userId),
    customerEmail: customerEmailFor(order),
    placedAt: order.placedAt,
    placedAtFormatted: formatUpdatedAt(order.placedAt),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.totals.total,
    totalFormatted: formatPrice(order.totals.total, order.currency),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod],
    status: order.status,
    countsAsSale: order.status !== 'Cancelled',
  }
}

/** All store-wide orders, newest first, shaped for the admin listing. */
export function getAdminOrders(): AdminOrderRow[] {
  return [...ADMIN_MOCK_ORDERS].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).map(toAdminRow)
}

// ─── Order detail (full line items, address, contact) ──────────────────────
// The list row above is a flattened summary; the detail page needs the full
// PlacedOrder shape plus a per-item SKU — which CartItem doesn't carry
// itself, so it's resolved the same way components/account/OrderDetailClient
// .tsx's "Buy Again" and lib/admin/mock-data.ts's seed builder already do:
// look the variant back up by (slug, color, size) via lib/product-detail-data
// .ts. Falls back to no SKU if the product/variant was since removed from
// the catalog, rather than throwing.

export interface AdminOrderItemRow {
  productId: string
  variantId: string
  slug: string
  name: string
  image: ProductImage
  color: string
  size: string
  sku: string | undefined
  quantity: number
  price: number
  currency: string
  lineTotal: number
}

export interface AdminOrderDetail {
  orderNumber: string
  placedAt: string
  placedAtFormatted: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentMethodLabel: string
  currency: string
  totals: CartTotals
  totalFormatted: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: ShippingAddress
  items: AdminOrderItemRow[]
  countsAsSale: boolean
}

function toItemRow(item: CartItem): AdminOrderItemRow {
  const product = getProductDetail(item.slug)
  const variant = product ? findVariant(product.variants, item.color, item.size) : undefined

  return {
    productId: item.productId,
    variantId: item.variantId,
    slug: item.slug,
    name: item.name,
    image: item.image,
    color: item.color,
    size: item.size,
    sku: variant?.sku,
    quantity: item.quantity,
    price: item.price,
    currency: item.currency,
    lineTotal: item.price * item.quantity,
  }
}

/** Full order detail, for the admin order detail page — everything the list
 *  row omits (contact, shipping address, line items). */
export function getAdminOrderDetail(orderNumber: string): AdminOrderDetail | undefined {
  const order = ADMIN_MOCK_ORDERS.find((o) => o.orderNumber === orderNumber)
  if (!order) return undefined

  const customer = ADMIN_MOCK_CUSTOMERS.find((c) => c.id === order.userId)

  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt,
    placedAtFormatted: formatUpdatedAt(order.placedAt),
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod],
    currency: order.currency,
    totals: order.totals,
    totalFormatted: formatPrice(order.totals.total, order.currency),
    customerName: customer?.name ?? 'Guest',
    customerEmail: customer?.email ?? order.contact.email,
    customerPhone: order.contact.phone,
    shippingAddress: order.shippingAddress,
    items: order.items.map(toItemRow),
    countsAsSale: order.status !== 'Cancelled',
  }
}
