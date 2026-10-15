// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Focused Runtime Test: Admin Order Cancellation (stock restore)
//
// Not part of the application build — a standalone, framework-free
// verification script (the project has no Jest/Vitest/etc. configured; see
// package.json) run manually via `npx tsx scripts/test-order-cancellation.ts`.
// Exercises the REAL exported lib/admin/orders.db.ts's updateOrderStatusInDb
// — the exact function lib/admin/orders.actions.ts's updateOrderStatusAction
// delegates to once requireAdminSession() has passed — against a handful of
// isolated, clearly-prefixed test rows (TEST-CANCEL-*) created and torn down
// by this script itself. updateOrderStatusAction itself is not called here:
// it calls next/headers's cookies() via requireAdminSession(), which only
// works inside a real Next.js request — outside one it throws regardless of
// who's calling, which is itself exercised directly below as the
// "unauthorized" check, by calling requireAdminSession() the same way the
// action does.
//
// Scenarios:
//   A — Confirmed order, 2 items (different variants) → Cancelled.
//       Both variants' stock must increase by exactly their own item's
//       quantity.
//   B — Cancel the SAME order a second time → stock must NOT move again.
//   C — Order with one item whose variantId is already NULL (simulating a
//       deleted variant via ON DELETE SET NULL) → Cancelled. Must succeed,
//       restoring only the item that still has a live variant.
//   D — Two concurrent cancellations of the same Confirmed order (racing
//       Promise.all) → stock must be restored exactly once, never twice.
//   E — requireAdminSession() outside a request context → must throw,
//       proving the auth guard still fires (the action calls this before
//       anything else, unchanged from before this fix).
//
// Cleanup runs in a finally block regardless of outcome, deleting only the
// rows this run itself created.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import assert from 'node:assert/strict'
import { prisma } from '../lib/prisma'
import { updateOrderStatusInDb } from '../lib/admin/orders.db'
import { requireAdminSession } from '../lib/admin/auth/admin-session.actions'

const RUN_ID = Date.now().toString(36)
const TAG = `TEST-CANCEL-${RUN_ID}`

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

  const createdOrderIds: string[] = []
  const createdVariantIds: string[] = []
  let createdUserId: string | null = null
  let createdProductId: string | null = null

  try {
    // ── Fixtures ──────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: { email: `${TAG}@example.invalid`, firstName: 'Test', lastName: 'Cancel', role: 'customer' },
    })
    createdUserId = user.id

    const product = await prisma.product.create({
      data: { name: `${TAG} Product`, slug: `${TAG}-product`.toLowerCase(), price: 1000, currency: 'INR', inStock: true },
    })
    createdProductId = product.id

    const STOCK_1 = 10
    const STOCK_2 = 5
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
      shipLastName: 'Cancel',
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
      paymentMethod: 'cod' as const,
      paymentStatus: 'Pending' as const,
    }

    // ── Scenario A: Confirmed order, 2 items, 2 different variants ───────
    const QTY_1 = 2
    const QTY_2 = 3
    const orderA = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-A`,
        status: 'Confirmed',
        ...commonFields,
        items: { create: [orderItemData(variant1, QTY_1, 'A-1'), orderItemData(variant2, QTY_2, 'A-2')] },
      },
    })
    createdOrderIds.push(orderA.id)

    await updateOrderStatusInDb(orderA.orderNumber, 'Cancelled')

    const [v1AfterA, v2AfterA] = await Promise.all([
      prisma.productVariant.findUniqueOrThrow({ where: { id: variant1.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: variant2.id } }),
    ])
    check('A: variant 1 stock restored by exactly its item quantity', () => {
      assert.equal(v1AfterA.stock, STOCK_1 + QTY_1)
    })
    check('A: variant 2 stock restored by exactly its item quantity', () => {
      assert.equal(v2AfterA.stock, STOCK_2 + QTY_2)
    })
    const orderAAfter = await prisma.order.findUniqueOrThrow({ where: { id: orderA.id } })
    check('A: order status is Cancelled', () => {
      assert.equal(orderAAfter.status, 'Cancelled')
    })

    // ── Scenario B: cancel the same order again — no second restoration ──
    await updateOrderStatusInDb(orderA.orderNumber, 'Cancelled')
    const [v1AfterB, v2AfterB] = await Promise.all([
      prisma.productVariant.findUniqueOrThrow({ where: { id: variant1.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: variant2.id } }),
    ])
    check('B: re-cancelling an already-Cancelled order does not restore stock again (variant 1)', () => {
      assert.equal(v1AfterB.stock, v1AfterA.stock)
    })
    check('B: re-cancelling an already-Cancelled order does not restore stock again (variant 2)', () => {
      assert.equal(v2AfterB.stock, v2AfterA.stock)
    })

    // ── Scenario C: order item with a NULL variantId (deleted variant) ───
    const variant3 = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-3`, color: 'Green', colorHex: '#00ff00', size: 'S', stock: 7 },
    })
    createdVariantIds.push(variant3.id)

    const orderC = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-C`,
        status: 'Confirmed',
        ...commonFields,
        items: { create: [orderItemData(variant3, 1, 'C-1')] },
      },
    })
    createdOrderIds.push(orderC.id)

    // Delete the variant out from under the order — the FK is ON DELETE SET
    // NULL (prisma/schema.prisma), so OrderItem.variantId becomes null,
    // exactly simulating a deleted/missing variant on a real order.
    await prisma.productVariant.delete({ where: { id: variant3.id } })
    createdVariantIds.splice(createdVariantIds.indexOf(variant3.id), 1)

    const orderCItemBefore = await prisma.orderItem.findFirstOrThrow({ where: { orderId: orderC.id } })
    check('C: OrderItem.variantId is null after the variant is deleted', () => {
      assert.equal(orderCItemBefore.variantId, null)
    })

    await checkAsync('C: cancelling an order with a deleted variant succeeds without throwing', async () => {
      const result = await updateOrderStatusInDb(orderC.orderNumber, 'Cancelled')
      assert.equal(result.status, 'Cancelled')
    })

    // ── Scenario D: two concurrent cancellations of the same order ───────
    const variant4 = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${TAG}-SKU-4`, color: 'Black', colorHex: '#000000', size: 'XL', stock: 20 },
    })
    createdVariantIds.push(variant4.id)

    const QTY_4 = 4
    const orderD = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-D`,
        status: 'Confirmed',
        ...commonFields,
        items: { create: [orderItemData(variant4, QTY_4, 'D-1')] },
      },
    })
    createdOrderIds.push(orderD.id)

    await Promise.all([
      updateOrderStatusInDb(orderD.orderNumber, 'Cancelled'),
      updateOrderStatusInDb(orderD.orderNumber, 'Cancelled'),
    ])

    const v4After = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant4.id } })
    check('D: two concurrent cancellations restore stock exactly once', () => {
      assert.equal(v4After.stock, 20 + QTY_4)
    })

    // ── Scenario E: unauthorized access ───────────────────────────────────
    await checkAsync('E: requireAdminSession() throws outside an authenticated request', async () => {
      await assert.rejects(() => requireAdminSession())
    })

    console.log(`\n${passed} check(s) passed.`)
  } finally {
    if (createdOrderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } }).catch((e) => console.error('[test] cleanup: order deletion failed', e))
    }
    if (createdVariantIds.length > 0) {
      await prisma.productVariant.deleteMany({ where: { id: { in: createdVariantIds } } }).catch((e) => console.error('[test] cleanup: variant deletion failed', e))
    }
    if (createdProductId) {
      await prisma.product.delete({ where: { id: createdProductId } }).catch((e) => console.error('[test] cleanup: product deletion failed', e))
    }
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch((e) => console.error('[test] cleanup: user deletion failed', e))
    }
    console.log('[test] cleanup complete — all TEST-CANCEL-* fixtures removed.')
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
