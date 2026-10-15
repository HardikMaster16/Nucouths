// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Focused Runtime Test: Admin Cancellation Coupon-Usage Release
//
// Not part of the application build — a standalone, framework-free
// verification script (the project has no Jest/Vitest/etc. configured; see
// package.json) run manually via
// `npx tsx scripts/test-cancellation-coupon-fix.ts`.
//
// Verifies the fix in lib/admin/orders.db.ts's updateOrderStatusInDb: on a
// genuine (claim.count === 1) transition into Cancelled, it now also
// releases one Coupon.usageCount via the same atomic, zero-floor-guarded
// conditional update lib/order-expiration.ts's expireOneOrder already uses
// — gated by the exact same claim that already guards stock restoration,
// so it inherits that guard's idempotency/concurrency guarantees for free.
//
// Exercises the REAL exported updateOrderStatusInDb and expirePendingOrders
// against isolated, clearly-prefixed test rows (TEST-COUPONFIX-*) created
// and torn down by this script itself.
//
// Scenarios:
//   A — Coupon with usageLimit 1, consumed by one Confirmed order
//       (usageCount 0→1 at "creation", simulated directly since this
//       script seeds rows via Prisma rather than placeOrderAction).
//       Admin-cancel that order → usageCount 1→0, stock restored.
//   B — Cancel the SAME order again → usageCount stays 0 (no re-release).
//   C — Two concurrent cancellations of a second coupon-order → usageCount
//       decreases exactly once, never twice, never to negative.
//   D — Cancel an order with NO coupon (couponId null) → succeeds, no
//       coupon touched, no crash.
//   E — Cancel an order whose coupon was deleted (ON DELETE SET NULL) →
//       succeeds without crashing; nothing to release.
//   F — An order already expired (lib/order-expiration.ts already set
//       status: Cancelled and released stock + coupon usage) → a later
//       admin-cancel attempt must be a no-op: no further coupon release.
//
// Cleanup runs in a finally block regardless of outcome, deleting only the
// rows this run itself created.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import assert from 'node:assert/strict'
import { prisma } from '../lib/prisma'
import { updateOrderStatusInDb } from '../lib/admin/orders.db'
import { expirePendingOrders } from '../lib/order-expiration'

const RUN_ID = Date.now().toString(36)
const TAG = `TEST-COUPONFIX-${RUN_ID}`

function minutesAgo(min: number): Date {
  return new Date(Date.now() - min * 60_000)
}

let passed = 0
function check(label: string, fn: () => void) {
  try {
    fn()
    console.log(`[PASS] ${label}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${label}:`, err)
    process.exitCode = 1
  }
}

async function checkAsync(label: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`[PASS] ${label}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${label}:`, err)
    process.exitCode = 1
  }
}

async function main() {
  console.log(`[test] run id: ${RUN_ID}`)

  const originalFindMany = prisma.order.findMany.bind(prisma.order)

  const createdOrderIds: string[] = []
  const createdVariantIds: string[] = []
  const createdCouponIds: string[] = []
  let createdUserId: string | null = null
  let createdProductId: string | null = null
  let patched = false

  try {
    // ── Fixtures ──────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: { email: `${TAG}@example.invalid`, firstName: 'Test', lastName: 'CouponFix', role: 'customer' },
    })
    createdUserId = user.id

    const product = await prisma.product.create({
      data: { name: `${TAG} Product`, slug: `${TAG}-product`.toLowerCase(), price: 1000, currency: 'INR', inStock: true },
    })
    createdProductId = product.id

    function orderItemData(variant: { id: string; sku: string; color: string; size: string }, quantity: number, label: string) {
      return {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        productSlug: product.slug,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        quantity,
        unitPrice: 1000,
        itemTotal: 1000 * quantity,
        imageSrc: '/test.jpg',
        imageAlt: label,
      }
    }

    const commonFields = {
      contactEmail: user.email,
      contactPhone: '9999999999',
      shipFirstName: 'Test',
      shipLastName: 'CouponFix',
      shipAddress: '123 Test Street',
      shipCity: 'Test City',
      shipState: 'Test State',
      shipPinCode: '000000',
      shipCountry: 'India',
      shipPhone: '9999999999',
      originalSubtotal: 1000,
      payableSubtotal: 900,
      total: 900,
      currency: 'INR',
      userId: user.id,
      paymentMethod: 'cod' as const,
      paymentStatus: 'Pending' as const,
    }

    // ── Scenario A: usageLimit-1 coupon, one order consumes it ────────────
    const couponA = await prisma.coupon.create({
      data: { code: `${TAG}-A`, type: 'fixed', value: 100, usageLimit: 1, usageCount: 0, startDate: minutesAgo(60) },
    })
    createdCouponIds.push(couponA.id)

    const variantA = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-A`, color: 'Red', colorHex: '#ff0000', size: 'M', stock: 10 },
    })
    createdVariantIds.push(variantA.id)

    // Simulate consumeCouponOrThrow's increment (this script seeds rows
    // directly via Prisma rather than calling placeOrderAction).
    await prisma.coupon.update({ where: { id: couponA.id }, data: { usageCount: { increment: 1 } } })
    const couponAAfterCreate = await prisma.coupon.findUniqueOrThrow({ where: { id: couponA.id } })
    check('A: usageCount 0 -> 1 when the order "consumes" the coupon', () => {
      assert.equal(couponAAfterCreate.usageCount, 1)
    })

    const QTY_A = 2
    const orderA = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-A`,
        status: 'Confirmed',
        couponId: couponA.id,
        placedAt: minutesAgo(5),
        ...commonFields,
        items: { create: [orderItemData(variantA, QTY_A, 'A-1')] },
      },
    })
    createdOrderIds.push(orderA.id)

    await updateOrderStatusInDb(orderA.orderNumber, 'Cancelled')

    const [couponAAfterCancel, variantAAfterCancel] = await Promise.all([
      prisma.coupon.findUniqueOrThrow({ where: { id: couponA.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: variantA.id } }),
    ])
    check('A: usageCount 1 -> 0 after admin cancellation', () => {
      assert.equal(couponAAfterCancel.usageCount, 0)
    })
    check('A: stock also restored correctly alongside coupon release', () => {
      assert.equal(variantAAfterCancel.stock, 10 + QTY_A)
    })

    // ── Scenario B: cancel the same order again — no re-release ──────────
    await updateOrderStatusInDb(orderA.orderNumber, 'Cancelled')
    const couponAAfterSecondCancel = await prisma.coupon.findUniqueOrThrow({ where: { id: couponA.id } })
    check('B: re-cancelling an already-Cancelled order leaves usageCount at 0 (no negative, no change)', () => {
      assert.equal(couponAAfterSecondCancel.usageCount, 0)
    })

    // ── Scenario C: concurrent cancellations of a second coupon order ────
    const couponC = await prisma.coupon.create({
      data: { code: `${TAG}-C`, type: 'fixed', value: 50, usageCount: 1, startDate: minutesAgo(60) },
    })
    createdCouponIds.push(couponC.id)

    const variantC = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-C`, color: 'Blue', colorHex: '#0000ff', size: 'L', stock: 5 },
    })
    createdVariantIds.push(variantC.id)

    const orderC = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-C`,
        status: 'Confirmed',
        couponId: couponC.id,
        placedAt: minutesAgo(5),
        ...commonFields,
        items: { create: [orderItemData(variantC, 1, 'C-1')] },
      },
    })
    createdOrderIds.push(orderC.id)

    await Promise.all([
      updateOrderStatusInDb(orderC.orderNumber, 'Cancelled'),
      updateOrderStatusInDb(orderC.orderNumber, 'Cancelled'),
    ])

    const couponCAfter = await prisma.coupon.findUniqueOrThrow({ where: { id: couponC.id } })
    check('C: two concurrent cancellations release usageCount exactly once (1 -> 0, never negative)', () => {
      assert.equal(couponCAfter.usageCount, 0)
    })

    // ── Scenario D: cancellation with no coupon ───────────────────────────
    const variantD = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-D`, color: 'Green', colorHex: '#00ff00', size: 'S', stock: 4 },
    })
    createdVariantIds.push(variantD.id)

    const orderD = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-D`,
        status: 'Confirmed',
        couponId: null,
        placedAt: minutesAgo(5),
        ...commonFields,
        items: { create: [orderItemData(variantD, 1, 'D-1')] },
      },
    })
    createdOrderIds.push(orderD.id)

    await checkAsync('D: cancelling an order with no coupon succeeds without touching any coupon', async () => {
      const updated = await updateOrderStatusInDb(orderD.orderNumber, 'Cancelled')
      assert.equal(updated.status, 'Cancelled')
    })

    // ── Scenario E: coupon deleted before cancellation ────────────────────
    const couponE = await prisma.coupon.create({
      data: { code: `${TAG}-E`, type: 'fixed', value: 50, usageCount: 1, startDate: minutesAgo(60) },
    })
    // Not pushed to createdCouponIds — deliberately deleted below as part
    // of the scenario, so cleanup must not try to delete it again.

    const variantE = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-E`, color: 'Yellow', colorHex: '#ffff00', size: 'S', stock: 3 },
    })
    createdVariantIds.push(variantE.id)

    const orderE = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-E`,
        status: 'Confirmed',
        couponId: couponE.id,
        placedAt: minutesAgo(5),
        ...commonFields,
        items: { create: [orderItemData(variantE, 1, 'E-1')] },
      },
    })
    createdOrderIds.push(orderE.id)

    // Delete the coupon out from under the order — ON DELETE SET NULL
    // (prisma/schema.prisma) makes OrderItem... er, Order.couponId null.
    await prisma.coupon.delete({ where: { id: couponE.id } })

    const orderEBeforeCancel = await prisma.order.findUniqueOrThrow({ where: { id: orderE.id } })
    check('E: Order.couponId is null after the coupon is deleted', () => {
      assert.equal(orderEBeforeCancel.couponId, null)
    })

    await checkAsync('E: cancelling an order with a deleted coupon succeeds without crashing', async () => {
      const updated = await updateOrderStatusInDb(orderE.orderNumber, 'Cancelled')
      assert.equal(updated.status, 'Cancelled')
    })

    // ── Scenario F: already-expired order — admin cancel must be a no-op ─
    const couponF = await prisma.coupon.create({
      data: { code: `${TAG}-F`, type: 'fixed', value: 50, usageCount: 1, startDate: minutesAgo(60) },
    })
    createdCouponIds.push(couponF.id)

    const variantF = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-F`, color: 'Black', colorHex: '#000000', size: 'XL', stock: 6 },
    })
    createdVariantIds.push(variantF.id)

    const QTY_F = 2
    const orderF = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-F`,
        status: 'Confirmed',
        paymentMethod: 'upi',
        paymentStatus: 'Pending',
        couponId: couponF.id,
        placedAt: minutesAgo(40), // old enough to be expiration-eligible
        contactEmail: user.email,
        contactPhone: '9999999999',
        shipFirstName: 'Test',
        shipLastName: 'CouponFix',
        shipAddress: '123 Test Street',
        shipCity: 'Test City',
        shipState: 'Test State',
        shipPinCode: '000000',
        shipCountry: 'India',
        shipPhone: '9999999999',
        originalSubtotal: 1000,
        payableSubtotal: 900,
        total: 900,
        currency: 'INR',
        userId: user.id,
        items: { create: [orderItemData(variantF, QTY_F, 'F-1')] },
      },
    })
    createdOrderIds.push(orderF.id)

    const testOrderIds = new Set([orderF.id])
    prisma.order.findMany = (async (args: unknown) => {
      const rows = await originalFindMany(args as never)
      return (rows as Array<{ id: string }>).filter((r) => testOrderIds.has(r.id))
    }) as typeof prisma.order.findMany
    patched = true

    const expireResult = await expirePendingOrders()
    patched = false
    prisma.order.findMany = originalFindMany

    const [orderFAfterExpire, couponFAfterExpire, variantFAfterExpire] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: orderF.id } }),
      prisma.coupon.findUniqueOrThrow({ where: { id: couponF.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: variantF.id } }),
    ])
    check('F: expiration claimed the order (status -> Cancelled, paymentStatus -> Failed)', () => {
      assert.ok(expireResult.expiredOrderNumbers.includes(orderF.orderNumber))
      assert.equal(orderFAfterExpire.status, 'Cancelled')
      assert.equal(orderFAfterExpire.paymentStatus, 'Failed')
    })
    check('F: expiration already released the coupon usage once (1 -> 0)', () => {
      assert.equal(couponFAfterExpire.usageCount, 0)
    })

    await checkAsync('F: a later admin-cancel attempt on the already-expired order does not release coupon usage again', async () => {
      const updated = await updateOrderStatusInDb(orderF.orderNumber, 'Cancelled')
      assert.equal(updated.status, 'Cancelled')
      const couponFFinal = await prisma.coupon.findUniqueOrThrow({ where: { id: couponF.id } })
      assert.equal(couponFFinal.usageCount, 0)
      const variantFFinal = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantF.id } })
      assert.equal(variantFFinal.stock, variantFAfterExpire.stock)
    })

    console.log(`\n${passed} check(s) passed.`)
  } finally {
    if (patched) prisma.order.findMany = originalFindMany

    if (createdOrderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } }).catch((e) => console.error('[test] cleanup: order deletion failed', e))
    }
    if (createdVariantIds.length > 0) {
      await prisma.productVariant.deleteMany({ where: { id: { in: createdVariantIds } } }).catch((e) => console.error('[test] cleanup: variant deletion failed', e))
    }
    if (createdCouponIds.length > 0) {
      await prisma.coupon.deleteMany({ where: { id: { in: createdCouponIds } } }).catch((e) => console.error('[test] cleanup: coupon deletion failed', e))
    }
    if (createdProductId) {
      await prisma.product.delete({ where: { id: createdProductId } }).catch((e) => console.error('[test] cleanup: product deletion failed', e))
    }
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch((e) => console.error('[test] cleanup: user deletion failed', e))
    }
    console.log('[test] cleanup complete — all TEST-COUPONFIX-* fixtures removed.')
  }
}

main()
  .catch((err) => {
    console.error('[test] unexpected error', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
