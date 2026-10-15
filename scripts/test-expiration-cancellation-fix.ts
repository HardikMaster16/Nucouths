// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Focused Runtime Test: Expiration → Cancelled (double-restoration
// fix)
//
// Not part of the application build — a standalone, framework-free
// verification script (the project has no Jest/Vitest/etc. configured; see
// package.json) run manually via
// `npx tsx scripts/test-expiration-cancellation-fix.ts`.
//
// Verifies the fix in lib/order-expiration.ts's expireOneOrder: the
// expiration claim now writes BOTH paymentStatus: 'Failed' AND
// status: 'Cancelled' in the same atomic update, so a later admin
// cancellation (lib/admin/orders.db.ts's updateOrderStatusInDb, whose own
// claim guard is `status != 'Cancelled'`) can no longer restore the same
// order's stock a second time.
//
// Exercises the REAL exported functions — expirePendingOrders (the exact
// function the cron endpoint calls) and updateOrderStatusInDb (the exact
// function the admin status editor delegates to, minus the
// requireAdminSession() guard its caller already applies first) — against
// isolated, clearly-prefixed test rows (TEST-EXPCANCEL-*) created and torn
// down by this script itself. Candidate discovery is scoped to this run's
// own order ids via the same prisma.order.findMany monkeypatch technique
// scripts/test-order-expiration.ts already uses, so the real sweep logic
// can never be invoked against a real row.
//
// Scenarios:
//   A — Pending, upi, Confirmed, placed 40 min ago, 2 items/2 variants,
//       no coupon → expires. status Confirmed→Cancelled, paymentStatus
//       Pending→Failed, both variants' stock restored by exactly their
//       own item quantity.
//   B — Admin cancellation attempted on A's order AFTER expiration → must
//       be rejected as a no-op (order already Cancelled) and must NOT
//       restore stock again.
//   C — Concurrent expiration: two sweeps racing the same eligible order
//       via Promise.all → stock restored exactly once, order claimed by
//       exactly one of the two calls.
//   D — Coupon order: Pending, upi, Confirmed, placed 40 min ago, with a
//       couponId and usageCount > 0 → expires, coupon usageCount
//       decremented by exactly 1 (existing behavior, unchanged by this
//       fix).
//   E — Normal, not-yet-expired order (Pending, upi, Confirmed, placed
//       just now) → untouched by the sweep: status stays Confirmed,
//       paymentStatus stays Pending, stock unchanged.
//
// Cleanup runs in a finally block regardless of outcome, deleting only the
// rows this run itself created.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import assert from 'node:assert/strict'
import { prisma } from '../lib/prisma'
import { expirePendingOrders } from '../lib/order-expiration'
import { updateOrderStatusInDb } from '../lib/admin/orders.db'

const RUN_ID = Date.now().toString(36)
const TAG = `TEST-EXPCANCEL-${RUN_ID}`

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
  let createdUserId: string | null = null
  let createdProductId: string | null = null
  let createdCouponId: string | null = null
  let patched = false

  try {
    // ── Fixtures ──────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: { email: `${TAG}@example.invalid`, firstName: 'Test', lastName: 'ExpCancel', role: 'customer' },
    })
    createdUserId = user.id

    const product = await prisma.product.create({
      data: { name: `${TAG} Product`, slug: `${TAG}-product`.toLowerCase(), price: 1000, currency: 'INR', inStock: true },
    })
    createdProductId = product.id

    const STOCK_1 = 10
    const STOCK_2 = 6
    const variant1 = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-1`, color: 'Red', colorHex: '#ff0000', size: 'M', stock: STOCK_1 },
    })
    createdVariantIds.push(variant1.id)
    const variant2 = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-2`, color: 'Blue', colorHex: '#0000ff', size: 'L', stock: STOCK_2 },
    })
    createdVariantIds.push(variant2.id)

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
      shipLastName: 'ExpCancel',
      shipAddress: '123 Test Street',
      shipCity: 'Test City',
      shipState: 'Test State',
      shipPinCode: '000000',
      shipCountry: 'India',
      shipPhone: '9999999999',
      originalSubtotal: 3000,
      payableSubtotal: 3000,
      total: 3000,
      currency: 'INR',
      userId: user.id,
      paymentMethod: 'upi' as const,
      paymentStatus: 'Pending' as const,
      razorpayOrderId: null,
    }

    // ── Scenario A: expires — status + paymentStatus + stock ─────────────
    const QTY_1 = 2
    const QTY_2 = 3
    const orderA = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-A`,
        status: 'Confirmed',
        placedAt: minutesAgo(40),
        ...commonFields,
        items: { create: [orderItemData(variant1, QTY_1, 'A-1'), orderItemData(variant2, QTY_2, 'A-2')] },
      },
    })
    createdOrderIds.push(orderA.id)

    // ── Scenario D fixture: coupon order, also expires ────────────────────
    const coupon = await prisma.coupon.create({
      data: {
        code: `${TAG}-COUPON`,
        type: 'fixed',
        value: 100,
        usageCount: 1,
        startDate: minutesAgo(60),
      },
    })
    createdCouponId = coupon.id

    const variant3 = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-3`, color: 'Green', colorHex: '#00ff00', size: 'S', stock: 8 },
    })
    createdVariantIds.push(variant3.id)

    const QTY_3 = 1
    const orderD = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-D`,
        status: 'Confirmed',
        placedAt: minutesAgo(40),
        couponId: coupon.id,
        ...commonFields,
        items: { create: [orderItemData(variant3, QTY_3, 'D-1')] },
      },
    })
    createdOrderIds.push(orderD.id)

    // ── Scenario E fixture: not old enough — untouched ────────────────────
    const variant4 = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-4`, color: 'Black', colorHex: '#000000', size: 'XL', stock: 9 },
    })
    createdVariantIds.push(variant4.id)

    const orderE = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-E`,
        status: 'Confirmed',
        placedAt: minutesAgo(1),
        ...commonFields,
        items: { create: [orderItemData(variant4, 1, 'E-1')] },
      },
    })
    createdOrderIds.push(orderE.id)

    // ── Scenario C fixture: separate order for the concurrency test ──────
    const variant5 = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-5`, color: 'White', colorHex: '#ffffff', size: 'M', stock: 15 },
    })
    createdVariantIds.push(variant5.id)

    const QTY_5 = 4
    const orderC = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-C`,
        status: 'Confirmed',
        placedAt: minutesAgo(40),
        ...commonFields,
        items: { create: [orderItemData(variant5, QTY_5, 'C-1')] },
      },
    })
    createdOrderIds.push(orderC.id)

    const testOrderIds = new Set(createdOrderIds)

    // ── Isolation: scope expirePendingOrders's candidate discovery to ONLY
    // this run's own order ids. ────────────────────────────────────────────
    prisma.order.findMany = (async (args: unknown) => {
      const rows = await originalFindMany(args as never)
      return (rows as Array<{ id: string }>).filter((r) => testOrderIds.has(r.id))
    }) as typeof prisma.order.findMany
    patched = true

    // ── Scenario A: run expiration, verify status/paymentStatus/stock ────
    const resultA = await expirePendingOrders()
    console.log('[test] expiration pass (A/D/E eligible, C intentionally also eligible here):', resultA)

    const [aAfter, v1After, v2After] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: orderA.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: variant1.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: variant2.id } }),
    ])

    check('A: status transitions Confirmed -> Cancelled', () => {
      assert.equal(aAfter.status, 'Cancelled')
    })
    check('A: paymentStatus transitions Pending -> Failed', () => {
      assert.equal(aAfter.paymentStatus, 'Failed')
    })
    check('A: variant 1 stock restored by exactly its item quantity (once)', () => {
      assert.equal(v1After.stock, STOCK_1 + QTY_1)
    })
    check('A: variant 2 stock restored by exactly its item quantity (once)', () => {
      assert.equal(v2After.stock, STOCK_2 + QTY_2)
    })
    check('A: order number reported as expired', () => {
      assert.ok(resultA.expiredOrderNumbers.includes(orderA.orderNumber))
    })

    // ── Scenario B: admin cancellation attempted after expiration ────────
    await checkAsync('B: admin cancellation after expiration does not restore stock again', async () => {
      const updated = await updateOrderStatusInDb(orderA.orderNumber, 'Cancelled')
      assert.equal(updated.status, 'Cancelled')
      const [v1AfterB, v2AfterB] = await Promise.all([
        prisma.productVariant.findUniqueOrThrow({ where: { id: variant1.id } }),
        prisma.productVariant.findUniqueOrThrow({ where: { id: variant2.id } }),
      ])
      assert.equal(v1AfterB.stock, STOCK_1 + QTY_1)
      assert.equal(v2AfterB.stock, STOCK_2 + QTY_2)
    })

    // ── Scenario D: coupon usage released exactly once ────────────────────
    const [dAfter, couponAfter] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: orderD.id } }),
      prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } }),
    ])
    check('D: coupon order also transitions to Cancelled/Failed', () => {
      assert.equal(dAfter.status, 'Cancelled')
      assert.equal(dAfter.paymentStatus, 'Failed')
    })
    check('D: coupon usageCount decremented by exactly 1', () => {
      assert.equal(couponAfter.usageCount, 0)
    })

    // ── Scenario E: untouched (not old enough) ────────────────────────────
    const eAfter = await prisma.order.findUniqueOrThrow({ where: { id: orderE.id } })
    check('E: not-yet-expired order is untouched (status still Confirmed)', () => {
      assert.equal(eAfter.status, 'Confirmed')
    })
    check('E: not-yet-expired order is untouched (paymentStatus still Pending)', () => {
      assert.equal(eAfter.paymentStatus, 'Pending')
    })

    // ── Scenario C: concurrent expiration of the same eligible order ─────
    // orderC is still Pending/Confirmed/eligible at this point (the sweep
    // above already processed it once synchronously — reset it back to
    // Pending/Confirmed to test a genuine race between two concurrent
    // sweeps that both see it as a candidate at once).
    await prisma.order.update({ where: { id: orderC.id }, data: { status: 'Confirmed', paymentStatus: 'Pending' } })
    const variant5Before = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant5.id } })

    const [raceResult1, raceResult2] = await Promise.all([expirePendingOrders(), expirePendingOrders()])
    const claimedByBoth =
      raceResult1.expiredOrderNumbers.includes(orderC.orderNumber) && raceResult2.expiredOrderNumbers.includes(orderC.orderNumber)
    const claimedByExactlyOne =
      raceResult1.expiredOrderNumbers.includes(orderC.orderNumber) !== raceResult2.expiredOrderNumbers.includes(orderC.orderNumber)

    check('C: concurrent expiration claims the order exactly once (not zero, not both)', () => {
      assert.ok(!claimedByBoth, 'both concurrent sweeps claimed the same order')
      assert.ok(claimedByExactlyOne, 'exactly one of the two concurrent sweeps should have claimed it')
    })

    const variant5After = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant5.id } })
    check('C: concurrent expiration restores stock exactly once (not twice)', () => {
      assert.equal(variant5After.stock, variant5Before.stock + QTY_5)
    })

    const orderCAfter = await prisma.order.findUniqueOrThrow({ where: { id: orderC.id } })
    check('C: order ends in Cancelled/Failed after the race', () => {
      assert.equal(orderCAfter.status, 'Cancelled')
      assert.equal(orderCAfter.paymentStatus, 'Failed')
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
    if (createdCouponId) {
      await prisma.coupon.delete({ where: { id: createdCouponId } }).catch((e) => console.error('[test] cleanup: coupon deletion failed', e))
    }
    if (createdProductId) {
      await prisma.product.delete({ where: { id: createdProductId } }).catch((e) => console.error('[test] cleanup: product deletion failed', e))
    }
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch((e) => console.error('[test] cleanup: user deletion failed', e))
    }
    console.log('[test] cleanup complete — all TEST-EXPCANCEL-* fixtures removed.')
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
