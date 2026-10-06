// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Order Reads (Prisma)
//
// Server-only reads backing /admin/orders and /admin/orders/[id]. Imported
// only from those Server Components and from lib/admin/orders.actions.ts's
// Server Action — never from a 'use client' component, so Prisma is never
// pulled into a browser bundle.
//
// OrderItem already carries its own historical snapshot columns
// (productName, sku, color, size, unitPrice, itemTotal, imageSrc/imageAlt —
// see prisma/schema.prisma) independent of the live Product/ProductVariant
// it optionally still references — so, unlike the mock path
// (lib/admin/orders.ts's toItemRow, which re-resolves a SKU by looking the
// variant back up via slug/color/size because CartItem never carried one),
// this reads the snapshot directly. A later edit, archive, or delete of the
// product/variant never changes what an order shows it contained.
//
// Prisma's OrderStatus enum values are TS identifiers (OutForDelivery), not
// the frontend's literal strings (lib/types.ts's OrderStatus, "Out for
// Delivery" with a space) — @map in the schema only affects the stored DB
// value. TO_PRISMA_ORDER_STATUS / FROM_PRISMA_ORDER_STATUS translate between
// them, the same mapping prisma/seed.ts's ORDER_STATUS_MAP already uses for
// the identical reason.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-pricing'
import { formatUpdatedAt } from './products'
import { PAYMENT_METHOD_LABELS } from '@/lib/order-storage'
import { requireAdminSession } from './auth/admin-session.actions'
import type { AdminOrderDetail, AdminOrderItemRow, AdminOrderRow } from './orders'
import type { OrderStatus, PaymentMethod, ShippingAddress } from '@/lib/types'
import type { CartTotals } from '@/lib/cart-pricing'
import type { OrderStatus as PrismaOrderStatus, Prisma } from '@prisma/client'

export const TO_PRISMA_ORDER_STATUS: Record<OrderStatus, PrismaOrderStatus> = {
  Confirmed: 'Confirmed',
  Processing: 'Processing',
  Shipped: 'Shipped',
  'Out for Delivery': 'OutForDelivery',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
}

export const FROM_PRISMA_ORDER_STATUS: Record<PrismaOrderStatus, OrderStatus> = {
  Confirmed: 'Confirmed',
  Processing: 'Processing',
  Shipped: 'Shipped',
  OutForDelivery: 'Out for Delivery',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
}

export const orderWithRelations = {
  user: { select: { firstName: true, lastName: true, email: true } },
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude

export type DbOrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderWithRelations }>

function customerName(order: Pick<DbOrderWithRelations, 'user'>): string {
  if (!order.user) return 'Guest'
  const name = `${order.user.firstName} ${order.user.lastName}`.trim()
  return name || 'Guest'
}

function toTotals(order: DbOrderWithRelations): CartTotals {
  const originalSubtotal = Number(order.originalSubtotal)
  const discount = Number(order.discount)
  const payableSubtotal = Number(order.payableSubtotal)
  const shipping = Number(order.shipping)
  const total = Number(order.total)

  return {
    originalSubtotal,
    discount,
    payableSubtotal,
    shipping,
    total,
    // Not a stored historical fact (the order's actual shipping charge is)
    // — recomputed the same way lib/cart-pricing.ts's calculateCartTotals
    // derives it, purely so OrderTotalsBreakdown (shared with /cart and
    // /checkout) has a value to render.
    amountToFreeShipping: Math.max(FREE_SHIPPING_THRESHOLD - payableSubtotal, 0),
  }
}

export function dbOrderToAdminRow(order: DbOrderWithRelations): AdminOrderRow {
  const status = FROM_PRISMA_ORDER_STATUS[order.status]
  const total = Number(order.total)
  const placedAt = order.placedAt.toISOString()

  return {
    orderNumber: order.orderNumber,
    customerName: customerName(order),
    customerEmail: order.user?.email ?? order.contactEmail,
    placedAt,
    placedAtFormatted: formatUpdatedAt(placedAt),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total,
    totalFormatted: formatPrice(total, order.currency),
    currency: order.currency,
    paymentMethod: order.paymentMethod as PaymentMethod,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod],
    status,
    countsAsSale: status !== 'Cancelled',
  }
}

function toItemRow(item: DbOrderWithRelations['items'][number], currency: string): AdminOrderItemRow {
  return {
    productId: item.productId ?? '',
    // Falls back to the OrderItem's own id (always present and unique) so
    // this stays a safe React list key even for an item whose product/
    // variant was since deleted (ON DELETE SET NULL) — never read for
    // anything besides that key (see components/admin/orders/
    // AdminOrderDetailView.tsx).
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

export function dbOrderToAdminDetail(order: DbOrderWithRelations): AdminOrderDetail {
  const status = FROM_PRISMA_ORDER_STATUS[order.status]
  const totals = toTotals(order)
  const placedAt = order.placedAt.toISOString()
  const shippingAddress: ShippingAddress = {
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

  return {
    orderNumber: order.orderNumber,
    placedAt,
    placedAtFormatted: formatUpdatedAt(placedAt),
    status,
    paymentMethod: order.paymentMethod as PaymentMethod,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod],
    currency: order.currency,
    totals,
    totalFormatted: formatPrice(totals.total, order.currency),
    customerName: customerName(order),
    customerEmail: order.user?.email ?? order.contactEmail,
    customerPhone: order.contactPhone,
    shippingAddress,
    items: order.items.map((item) => toItemRow(item, order.currency)),
    countsAsSale: status !== 'Cancelled',
  }
}

/** All store-wide orders, newest first, shaped for the admin listing.
 *  Requires an admin session — app/admin/(dashboard)/orders/page.tsx has no
 *  guard of its own (the client-side AdminShell redirect doesn't stop a
 *  Server Component's data fetch from running or reaching the RSC payload —
 *  see Next.js's own authentication guide), so the check happens here,
 *  right at the data source, before any customer/order PII is ever read. */
export async function listAdminOrders(): Promise<AdminOrderRow[]> {
  await requireAdminSession()
  const orders = await prisma.order.findMany({ include: orderWithRelations, orderBy: { placedAt: 'desc' } })
  return orders.map(dbOrderToAdminRow)
}

/** Full order detail, for the admin order detail page — looked up by
 *  orderNumber (the same value /admin/orders/[id]'s URL param already is;
 *  no route change needed), not the internal Order.id. Requires an admin
 *  session — see listAdminOrders's docstring above. */
export async function getAdminOrderDetail(orderNumber: string): Promise<AdminOrderDetail | undefined> {
  await requireAdminSession()
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderWithRelations })
  return order ? dbOrderToAdminDetail(order) : undefined
}
