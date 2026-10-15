// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — READ-ONLY Audit: Historical Order Cancellation / Expiration /
// Coupon Integrity
//
// Strictly read-only. Contains ZERO write operations (no .update/.updateMany/
// .create/.delete anywhere in this file) — only .findMany/.findUnique/.count.
// Run via `npx tsx scripts/audit-cancellation-integrity.ts`.
//
// Pulls only the non-PII fields requested by the audit: order number, status,
// paymentStatus, paymentMethod, placedAt/updatedAt, couponId, item
// variantId/quantity, current variant stock, coupon usageCount/usageLimit.
// Never selects contactEmail/contactPhone/shipping fields/userId.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const totalOrders = await prisma.order.count()
  const totalCancelled = await prisma.order.count({ where: { status: 'Cancelled' } })
  const totalCouponBacked = await prisma.order.count({ where: { couponId: { not: null } } })
  const totalCouponBackedCancelled = await prisma.order.count({ where: { status: 'Cancelled', couponId: { not: null } } })
  const totalFailedPayment = await prisma.order.count({ where: { paymentStatus: 'Failed' } })
  const totalCancelledAndFailed = await prisma.order.count({ where: { status: 'Cancelled', paymentStatus: 'Failed' } })
  const totalConfirmedAndFailed = await prisma.order.count({ where: { status: 'Confirmed', paymentStatus: 'Failed' } })

  console.log('=== Headline counts ===')
  console.log({
    totalOrders,
    totalCancelled,
    totalCouponBacked,
    totalCouponBackedCancelled,
    totalFailedPayment,
    totalCancelledAndFailed,
    totalConfirmedAndFailed,
  })

  console.log('\n=== All Cancelled orders (full non-PII detail) ===')
  const cancelledOrders = await prisma.order.findMany({
    where: { status: 'Cancelled' },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      placedAt: true,
      updatedAt: true,
      couponId: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      paidAt: true,
      items: { select: { variantId: true, quantity: true, sku: true } },
    },
    orderBy: { placedAt: 'asc' },
  })
  for (const o of cancelledOrders) {
    console.log(JSON.stringify(o, null, 0))
  }

  console.log('\n=== Confirmed orders currently at paymentStatus=Failed (never reached Cancelled) ===')
  const stuckFailed = await prisma.order.findMany({
    where: { status: 'Confirmed', paymentStatus: 'Failed' },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      placedAt: true,
      updatedAt: true,
      couponId: true,
      items: { select: { variantId: true, quantity: true, sku: true } },
    },
    orderBy: { placedAt: 'asc' },
  })
  for (const o of stuckFailed) {
    console.log(JSON.stringify(o, null, 0))
  }

  console.log('\n=== Current stock for every variant referenced by a Cancelled order ===')
  const variantIds = [
    ...new Set(cancelledOrders.flatMap((o) => o.items.map((i) => i.variantId)).filter((id): id is string => !!id)),
  ]
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, sku: true, stock: true, productId: true },
  })
  for (const v of variants) {
    console.log(JSON.stringify(v))
  }
  const missingVariantIds = cancelledOrders
    .flatMap((o) => o.items.map((i) => i.variantId))
    .filter((id): id is string => !!id)
    .filter((id) => !variants.some((v) => v.id === id))
  console.log('variantIds referenced by a Cancelled order but no longer existing (deleted):', [...new Set(missingVariantIds)])

  console.log('\n=== Every coupon ever referenced by couponId on any order, with usage detail ===')
  const couponIds = [...new Set((await prisma.order.findMany({ select: { couponId: true } })).map((o) => o.couponId).filter((id): id is string => !!id))]
  const coupons = await prisma.coupon.findMany({
    where: { id: { in: couponIds } },
    select: { id: true, code: true, usageCount: true, usageLimit: true, enabled: true, createdAt: true },
  })
  for (const c of coupons) {
    const ordersForCoupon = await prisma.order.findMany({
      where: { couponId: c.id },
      select: { orderNumber: true, status: true, paymentStatus: true, paymentMethod: true, placedAt: true },
      orderBy: { placedAt: 'asc' },
    })
    console.log(JSON.stringify({ coupon: c, orderCount: ordersForCoupon.length, orders: ordersForCoupon }, null, 0))
  }

  console.log('\n=== Orphaned couponIds (Order.couponId set but no matching Coupon row — deleted coupon) ===')
  const ordersWithCoupon = await prisma.order.findMany({
    where: { couponId: { not: null } },
    select: { orderNumber: true, couponId: true, status: true, paymentStatus: true },
  })
  const orphaned = ordersWithCoupon.filter((o) => o.couponId && !coupons.some((c) => c.id === o.couponId))
  console.log(JSON.stringify(orphaned))

  console.log('\n=== Seed/demo marker check — orders whose orderNumber does not look like a real generated number ===')
  // generateOrderNumber's real shape vs seed data's shape is inspected manually
  // against prisma/seed.ts separately; this just lists every order number for
  // manual cross-reference, grouped by prefix pattern.
  const allOrderNumbers = await prisma.order.findMany({ select: { orderNumber: true, placedAt: true }, orderBy: { placedAt: 'asc' } })
  console.log(JSON.stringify(allOrderNumbers))

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[audit] error', err)
  process.exitCode = 1
})
