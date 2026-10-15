// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Order Reads & Writes (Prisma)
//
// Server-only reads backing /admin/orders and /admin/orders/[id], plus the
// one write (updateOrderStatusInDb) behind the status editor there. Imported
// only from those Server Components and from lib/admin/orders.actions.ts's
// Server Action, which calls requireAdminSession() before ever reaching this
// file — never from a 'use client' component, so Prisma is never pulled into
// a browser bundle.
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
//
// updateOrderStatusInDb's stock-restoration-on-cancel logic (and the
// concurrency reasoning behind its atomic claim-then-restore shape) mirrors
// lib/order-expiration.ts's expireOneOrder, which already solves the exact
// same problem — releasing stock reserved by placeOrderAction's decrement —
// for a different trigger (an abandoned Pending order expiring, vs an admin
// explicitly cancelling one here).
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

/** Writes the order's new status and, only when this is the specific
 *  transition INTO Cancelled from a non-Cancelled (stock-consuming) status,
 *  restores every OrderItem's quantity back onto its ProductVariant.stock —
 *  the inverse of the decrement placeOrderAction made at purchase time —
 *  and releases one Coupon.usageCount if the order consumed one, the
 *  inverse of consumeCouponOrThrow's increment. Does NOT call
 *  requireAdminSession() itself — the one caller, lib/admin/
 *  orders.actions.ts's updateOrderStatusAction, already does so before
 *  this is ever reached; this split (same as expireOneOrder living apart
 *  from the admin-authenticated callers that might one day trigger
 *  something similar) is what lets this be exercised directly in a
 *  standalone script/test without faking a Next.js request's cookies().
 *
 *  Everything below runs in one transaction:
 *    1. Atomically claims the transition — `UPDATE "Order" SET status = ?
 *       WHERE orderNumber = ? [AND status != 'Cancelled']`, the conditional
 *       clause applying only when the target is Cancelled. Two concurrent
 *       calls for the same order (a race, or a retried request) serialize
 *       on Postgres's row lock; only the first still matches the WHERE
 *       clause by the time it runs, so a second call can never also see
 *       claim.count === 1 and double-restore — the same claim-then-restore
 *       shape lib/order-expiration.ts's expireOneOrder already uses for
 *       the identical reason. Transitions to any other target status are
 *       unrestricted, exactly as before this change.
 *    2. Re-reads the order WITH its OrderItems to return (and, if claimed,
 *       to know exactly what to restore) — if nothing matches, the order
 *       doesn't exist at all.
 *    3. Only when claim.count === 1 (a genuine, newly-claimed transition
 *       into Cancelled — never on an order that was already Cancelled),
 *       increments each item's variant by its own `quantity` with a plain
 *       additive `{ increment }` update — race-free by construction, never
 *       a read-check-write. An item whose variantId is already null (this
 *       schema's OrderItem.variantId FK is ON DELETE SET NULL — see
 *       prisma/schema.prisma) has no row left to restore stock to and is
 *       skipped, same handling as expireOneOrder.
 *    4. Still only when claim.count === 1, releases order.couponId's usage
 *       by exactly 1 — the same atomic, zero-floor-guarded
 *       `usageCount: { gt: 0 }` conditional update expireOneOrder already
 *       uses, so this can never go negative. order.couponId is already
 *       null here if the Coupon row itself was since deleted (ON DELETE
 *       SET NULL), which this skips the same way a deleted variant is
 *       skipped above — there is no usage left to release on a coupon
 *       that no longer exists.
 *  Gating both the stock restoration and the coupon release on the SAME
 *  claim.count === 1 means an order expiration already got to first (which
 *  now also claims status: Cancelled — see lib/order-expiration.ts) leaves
 *  this entire block unreached: no double stock restoration and no double
 *  coupon release.
 *  A failure at any step rolls back the status change along with every
 *  increment/release already applied in this call — there is no partial
 *  restoration. */
export async function updateOrderStatusInDb(orderNumber: string, status: OrderStatus): Promise<DbOrderWithRelations> {
  const targetStatus = TO_PRISMA_ORDER_STATUS[status]
  const isCancelling = targetStatus === 'Cancelled'

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const claim = await tx.order.updateMany({
      where: isCancelling ? { orderNumber, status: { not: 'Cancelled' } } : { orderNumber },
      data: { status: targetStatus },
    })

    const order = await tx.order.findUnique({ where: { orderNumber }, include: orderWithRelations })
    if (!order) throw new Error('Order not found.')

    // claim.count === 0 here only happens when isCancelling and the order
    // was already Cancelled — a no-op, not an error, and stock/coupon usage
    // must not be restored again.
    if (isCancelling && claim.count === 1) {
      for (const item of order.items) {
        if (!item.variantId) continue
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      }

      if (order.couponId) {
        await tx.coupon.updateMany({
          where: {
            id: order.couponId,
            usageCount: { gt: 0 },
          },
          data: {
            usageCount: { decrement: 1 },
          },
        })
      }
    }

    return order
  })
}
