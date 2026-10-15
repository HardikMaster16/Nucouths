// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Focused Runtime Test: Pending Order Expiration (stock-leak fix)
//
// Not part of the application build — a standalone, framework-free
// verification script (the project has no Jest/Vitest/etc. configured; see
// package.json) run manually via `npx tsx scripts/test-order-expiration.ts`.
// Exercises the REAL exported lib/order-expiration.ts's expirePendingOrders()
// — the exact function app/api/cron/expire-pending-orders/route.ts calls —
// against a handful of isolated, clearly-prefixed test rows (TEST-EXP-*)
// created and torn down by this script itself. Never touches any real
// order: prisma.order.findMany is monkeypatched for the duration of this
// script ONLY, to intersect the real candidate scan's results with this
// script's own test order ids, so expireOneOrder (the actual mutating
// claim+restore+release logic inside expirePendingOrders) can never be
// invoked against a real row — it only ever receives ids this script
// created. The two real orders this fix is meant to reclaim (NUC-20039,
// NCT-MUE9HRQGZHV) are read before and after purely to prove this run did
// not touch them; reclaiming them for real is a separate, deliberate step
// (see the task's "DO NOT update production rows automatically yet").
//
// Scenarios (the task's required A–E, plus two extra from requirement #7's
// full "never restore for" list — Delivered and Cancelled — for
// completeness):
//   A — Pending, upi, Confirmed, razorpayOrderId=NULL, placed 40 min ago
//       → must expire; stock +1 exactly once.
//   B — same order, sweep run a second time → no second restoration.
//   C — Paid, upi, Confirmed, razorpayOrderId set, placed 40 min ago
//       → must stay untouched (already paid).
//   D — Pending, COD, Confirmed, placed 40 min ago
//       → must stay untouched (COD is never swept).
//   E — Pending, upi, Confirmed, razorpayOrderId set, placed 5 min ago
//       → must stay untouched (not old enough yet).
//   F — Paid, upi, Delivered, placed 40 min ago
//       → must stay untouched (not Pending/Confirmed).
//   G — Failed, card, Cancelled, placed 40 min ago
//       → must stay untouched (not Pending/Confirmed).
//
// Cleanup runs in a finally block regardless of outcome, deleting only the
// rows this run itself created (tracked as they're created, so a failure
// partway through fixture setup still cleans up whatever did get created).
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import assert from 'node:assert/strict'
import { prisma } from '../lib/prisma'
import { expirePendingOrders, getPendingOrderExpiryMinutes } from '../lib/order-expiration'

const RUN_ID = Date.now().toString(36)
const TAG = `TEST-EXP-${RUN_ID}`

const REAL_STUCK_ORDER_NUMBERS = ['NUC-20039', 'NCT-MUE9HRQGZHV']

function minutesAgo(min: number): Date {
  return new Date(Date.now() - min * 60_000)
}

/** Always goes through `finder` (the UNPATCHED findMany) explicitly — this
 *  must never be affected by the test-isolation monkeypatch below, which
 *  intentionally filters prisma.order.findMany's results to test-only ids
 *  for the duration of the sweep calls. Using the module-level
 *  prisma.order.findMany here (while patched) would make the real orders
 *  look deleted/missing, when they were never touched at all. */
async function snapshotRealStuckOrders(finder: typeof prisma.order.findMany) {
  return finder({
    where: { orderNumber: { in: REAL_STUCK_ORDER_NUMBERS } },
    select: { orderNumber: true, paymentStatus: true, status: true, razorpayOrderId: true },
  })
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

async function main() {
  console.log(`[test] run id: ${RUN_ID}`)
  console.log(`[test] PENDING_ORDER_EXPIRY_MINUTES = ${getPendingOrderExpiryMinutes()} (used as the real cutoff below)`)

  const originalFindMany = prisma.order.findMany.bind(prisma.order)

  const beforeRealStuck = await snapshotRealStuckOrders(originalFindMany)
  console.log('[test] real stuck orders BEFORE (must be identical AFTER):', beforeRealStuck)

  const createdOrderIds: string[] = []
  let createdUserId: string | null = null
  let createdProductId: string | null = null
  let createdVariantId: string | null = null
  let patched = false

  try {
    // ── Fixtures ──────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: { email: `${TAG}@example.invalid`, firstName: 'Test', lastName: 'Expiry', role: 'customer' },
    })
    createdUserId = user.id

    const product = await prisma.product.create({
      data: {
        name: `${TAG} Product`,
        slug: `${TAG}-product`.toLowerCase(),
        price: 1000,
        currency: 'INR',
        inStock: true,
      },
    })
    createdProductId = product.id

    const STARTING_STOCK = 10
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `${TAG}-SKU`,
        color: 'TestColor',
        colorHex: '#000000',
        size: 'TestSize',
        stock: STARTING_STOCK,
      },
    })
    createdVariantId = variant.id

    function orderItemData(label: string) {
      return {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        productSlug: product.slug,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        quantity: 1,
        unitPrice: 1000,
        itemTotal: 1000,
        imageSrc: '/test.jpg',
        imageAlt: label,
      }
    }

    const commonFields = {
      contactEmail: user.email,
      contactPhone: '9999999999',
      shipFirstName: 'Test',
      shipLastName: 'Expiry',
      shipAddress: '123 Test Street',
      shipCity: 'Test City',
      shipState: 'Test State',
      shipPinCode: '000000',
      shipCountry: 'India',
      shipPhone: '9999999999',
      originalSubtotal: 1000,
      payableSubtotal: 1000,
      total: 1000,
      currency: 'INR',
      userId: user.id,
    }

    const orderA = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-A`,
        paymentMethod: 'upi',
        status: 'Confirmed',
        paymentStatus: 'Pending',
        razorpayOrderId: null,
        placedAt: minutesAgo(40),
        ...commonFields,
        items: { create: [orderItemData('A')] },
      },
    })
    createdOrderIds.push(orderA.id)

    const orderC = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-C`,
        paymentMethod: 'upi',
        status: 'Confirmed',
        paymentStatus: 'Paid',
        razorpayOrderId: `${TAG}-rzp-c`,
        razorpayPaymentId: `${TAG}-pay-c`,
        paidAt: new Date(),
        placedAt: minutesAgo(40),
        ...commonFields,
        items: { create: [orderItemData('C')] },
      },
    })
    createdOrderIds.push(orderC.id)

    const orderD = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-D`,
        paymentMethod: 'cod',
        status: 'Confirmed',
        paymentStatus: 'Pending',
        razorpayOrderId: null,
        placedAt: minutesAgo(40),
        ...commonFields,
        items: { create: [orderItemData('D')] },
      },
    })
    createdOrderIds.push(orderD.id)

    const orderE = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-E`,
        paymentMethod: 'upi',
        status: 'Confirmed',
        paymentStatus: 'Pending',
        razorpayOrderId: `${TAG}-rzp-e`,
        placedAt: minutesAgo(5),
        ...commonFields,
        items: { create: [orderItemData('E')] },
      },
    })
    createdOrderIds.push(orderE.id)

    const orderF = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-F`,
        paymentMethod: 'upi',
        status: 'Delivered',
        paymentStatus: 'Paid',
        razorpayOrderId: `${TAG}-rzp-f`,
        razorpayPaymentId: `${TAG}-pay-f`,
        paidAt: new Date(),
        placedAt: minutesAgo(40),
        ...commonFields,
        items: { create: [orderItemData('F')] },
      },
    })
    createdOrderIds.push(orderF.id)

    const orderG = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-G`,
        paymentMethod: 'card',
        status: 'Cancelled',
        paymentStatus: 'Failed',
        razorpayOrderId: null,
        placedAt: minutesAgo(40),
        ...commonFields,
        items: { create: [orderItemData('G')] },
      },
    })
    createdOrderIds.push(orderG.id)

    const testOrderIds = new Set(createdOrderIds)

    // ── Isolation: scope the real sweep's candidate discovery to ONLY
    // these test order ids, so expireOneOrder (the real mutating logic)
    // can never be invoked against a real row, no matter what else is in
    // the table. ──────────────────────────────────────────────────────────
    prisma.order.findMany = (async (args: unknown) => {
      const rows = await originalFindMany(args as never)
      return (rows as Array<{ id: string }>).filter((r) => testOrderIds.has(r.id))
    }) as typeof prisma.order.findMany
    patched = true

    // ── Pass 1 ────────────────────────────────────────────────────────────
    const result1 = await expirePendingOrders()
    console.log('[test] pass 1 result:', result1)

    const variantAfter1 = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })
    const [aAfter1, cAfter1, dAfter1, eAfter1, fAfter1, gAfter1] = await Promise.all(
      [orderA, orderC, orderD, orderE, orderF, orderG].map((o) =>
        prisma.order.findUniqueOrThrow({ where: { id: o.id } })
      )
    )

    check('A: expired exactly once (paymentStatus -> Failed)', () => {
      assert.equal(aAfter1.paymentStatus, 'Failed')
      assert.ok(result1.expiredOrderNumbers.includes(orderA.orderNumber))
    })
    check('A: stock restored by exactly +1 after pass 1', () => {
      // This script seeds Order/OrderItem rows directly via Prisma — it
      // never calls placeOrderAction, so none of the 6 fixture orders
      // actually decremented ProductVariant.stock at creation time (unlike
      // a real checkout). STARTING_STOCK is therefore still the true
      // baseline; only A's expiry-driven restoration should move it, by
      // exactly +1 (its own OrderItem.quantity).
      assert.equal(variantAfter1.stock, STARTING_STOCK + 1)
    })
    check('C (Paid) untouched', () => {
      assert.equal(cAfter1.paymentStatus, 'Paid')
      assert.equal(cAfter1.status, 'Confirmed')
    })
    check('D (COD Pending) untouched', () => {
      assert.equal(dAfter1.paymentStatus, 'Pending')
      assert.equal(dAfter1.status, 'Confirmed')
    })
    check('E (Pending online, not old enough) untouched', () => {
      assert.equal(eAfter1.paymentStatus, 'Pending')
    })
    check('F (Delivered/Paid) untouched', () => {
      assert.equal(fAfter1.paymentStatus, 'Paid')
      assert.equal(fAfter1.status, 'Delivered')
    })
    check('G (Cancelled/Failed) untouched', () => {
      assert.equal(gAfter1.paymentStatus, 'Failed')
      assert.equal(gAfter1.status, 'Cancelled')
    })

    // ── Pass 2 — idempotency ────────────────────────────────────────────
    const result2 = await expirePendingOrders()
    console.log('[test] pass 2 result:', result2)

    const variantAfter2 = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })

    check('B: second sweep does not re-expire A', () => {
      assert.ok(!result2.expiredOrderNumbers.includes(orderA.orderNumber))
    })
    check('B: second sweep does not restore stock a second time', () => {
      assert.equal(variantAfter2.stock, variantAfter1.stock)
    })

    // ── Real production rows must be completely unaffected ──────────────
    const afterRealStuck = await snapshotRealStuckOrders(originalFindMany)
    check('Real stuck production orders (NUC-20039, NCT-MUE9HRQGZHV) untouched by this run', () => {
      assert.deepEqual(afterRealStuck, beforeRealStuck)
    })

    console.log(`\n${passed} check(s) passed.`)
  } finally {
    if (patched) prisma.order.findMany = originalFindMany

    // ── Cleanup — delete only what this run created, best-effort so one
    // failed deletion doesn't block the rest. ────────────────────────────
    if (createdOrderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } }).catch((e) => console.error('[test] cleanup: order deletion failed', e))
    }
    if (createdVariantId) {
      await prisma.productVariant.delete({ where: { id: createdVariantId } }).catch((e) => console.error('[test] cleanup: variant deletion failed', e))
    }
    if (createdProductId) {
      await prisma.product.delete({ where: { id: createdProductId } }).catch((e) => console.error('[test] cleanup: product deletion failed', e))
    }
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch((e) => console.error('[test] cleanup: user deletion failed', e))
    }
    console.log('[test] cleanup complete — all TEST-EXP-* fixtures removed.')
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
