// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Order History Reads (Prisma, server-only)
//
// Server-only reads backing /account/orders and /account/orders/[id].
// Imported only from lib/orders.actions.ts's Server Actions — never from a
// 'use client' component, so Prisma is never pulled into the browser
// bundle.
//
// Reuses lib/admin/orders.db.ts's FROM_PRISMA_ORDER_STATUS mapping and its
// core convention: OrderItem already carries its own historical snapshot
// columns (productName, sku, color, size, unitPrice, itemTotal, imageSrc/
// imageAlt), so this reads those directly and never re-resolves the live
// Product/ProductVariant — a later price change, rename, image swap, or
// deletion can never alter what a past order shows it contained. The same
// guarantee applies to the shipping address: it's read from the Order's own
// ship* snapshot columns, never from a live Address row, so a customer
// editing or deleting their saved address never rewrites order history.
//
// Ownership is enforced by the query's own WHERE clause ({ userId } for the
// list, { orderNumber, userId } together for one order) — never filtered
// after the fact — and callers (lib/orders.actions.ts) always pass a userId
// that came from requireCustomerSession(), never from client input.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/cart-pricing'
import { FROM_PRISMA_ORDER_STATUS } from './admin/orders.db'
import type { OrderPaymentStatus, OrderStatus, PaymentMethod, ProductImage, ShippingAddress } from './types'
import type { CartTotals } from './cart-pricing'
import type { Prisma } from '@prisma/client'

export interface CustomerOrderItemRow {
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

export interface CustomerOrderTotals extends CartTotals {
  /** How much a coupon (if any) took off this order — kept separate from
   *  `discount` (the per-item sale markdown already in CartTotals), the
   *  same distinction Order.couponDiscount's own schema docstring draws. */
  couponDiscount: number
}

export interface CustomerOrderSummary {
  orderNumber: string
  placedAt: string
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  paymentMethod: PaymentMethod
  currency: string
  itemCount: number
  total: number
  items: CustomerOrderItemRow[]
}

export interface CustomerOrderDetail {
  orderNumber: string
  placedAt: string
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  paymentMethod: PaymentMethod
  currency: string
  totals: CustomerOrderTotals
  /** The coupon code actually used, or null — read from the Coupon relation
   *  at display time (a coupon's own code never changes after creation, so
   *  this isn't a "live" value in the way price/name/image would be). */
  couponCode: string | null
  contactEmail: string
  contactPhone: string
  shippingAddress: ShippingAddress
  items: CustomerOrderItemRow[]
}

const customerOrderInclude = {
  items: { orderBy: { id: 'asc' } },
  coupon: { select: { code: true } },
} satisfies Prisma.OrderInclude

type DbCustomerOrder = Prisma.OrderGetPayload<{ include: typeof customerOrderInclude }>

function toItemRow(item: DbCustomerOrder['items'][number], currency: string): CustomerOrderItemRow {
  return {
    productId: item.productId ?? '',
    // Falls back to the OrderItem's own id (always present and unique) so
    // this stays a safe React list key even for an item whose variant was
    // since deleted (ON DELETE SET NULL) — same fallback lib/admin/
    // orders.db.ts's toItemRow uses.
    variantId: item.variantId ?? item.id,
    slug: item.productSlug,
    name: item.productName,
    image: { src: item.imageSrc, alt: item.imageAlt },
    color: item.color,
    size: item.size,
    sku: item.sku ?? undefined,
    quantity: item.quantity,
    price: Number(item.unitPrice),
    currency,
    lineTotal: Number(item.itemTotal),
  }
}

function toTotals(order: DbCustomerOrder): CustomerOrderTotals {
  const payableSubtotal = Number(order.payableSubtotal)
  return {
    originalSubtotal: Number(order.originalSubtotal),
    discount: Number(order.discount),
    payableSubtotal,
    shipping: Number(order.shipping),
    total: Number(order.total),
    // Not a stored historical fact — recomputed the same way lib/admin/
    // orders.db.ts's toTotals does, purely so OrderTotalsBreakdown has a
    // value to render.
    amountToFreeShipping: Math.max(FREE_SHIPPING_THRESHOLD - payableSubtotal, 0),
    couponDiscount: Number(order.couponDiscount),
  }
}

function toShippingAddress(order: DbCustomerOrder): ShippingAddress {
  return {
    firstName: order.shipFirstName,
    lastName: order.shipLastName,
    address: order.shipAddress,
    apartment: order.shipApartment ?? undefined,
    city: order.shipCity,
    state: order.shipState,
    pinCode: order.shipPinCode,
    country: order.shipCountry,
    phone: order.shipPhone,
  }
}

function toSummary(order: DbCustomerOrder): CustomerOrderSummary {
  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt.toISOString(),
    status: FROM_PRISMA_ORDER_STATUS[order.status],
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod as PaymentMethod,
    currency: order.currency,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: Number(order.total),
    items: order.items.map((item) => toItemRow(item, order.currency)),
  }
}

function toDetail(order: DbCustomerOrder): CustomerOrderDetail {
  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt.toISOString(),
    status: FROM_PRISMA_ORDER_STATUS[order.status],
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod as PaymentMethod,
    currency: order.currency,
    totals: toTotals(order),
    couponCode: order.coupon?.code ?? null,
    contactEmail: order.contactEmail,
    contactPhone: order.contactPhone,
    shippingAddress: toShippingAddress(order),
    items: order.items.map((item) => toItemRow(item, order.currency)),
  }
}

/** All of the given customer's orders, newest first. Ownership is the WHERE
 *  clause itself (userId), never filtered after the fact. */
export async function listMyOrders(userId: string): Promise<CustomerOrderSummary[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: customerOrderInclude,
    orderBy: { placedAt: 'desc' },
  })
  return orders.map(toSummary)
}

/** One order, scoped to {orderNumber, userId} together in the same query —
 *  a mismatch (wrong owner or unknown number) returns null exactly like
 *  "doesn't exist", so a probing customer can't tell the two apart. */
export async function getMyOrder(userId: string, orderNumber: string): Promise<CustomerOrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: customerOrderInclude,
  })
  return order ? toDetail(order) : null
}
