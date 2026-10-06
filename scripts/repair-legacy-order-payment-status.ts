// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — One-Time Legacy Order Payment-Status Repair
//
// Run with: npx tsx scripts/repair-legacy-order-payment-status.ts
//           npx tsx scripts/repair-legacy-order-payment-status.ts --dry-run
//
// WHY THIS EXISTS
// ────────────────
// prisma/migrations/20260922112604_add_order_payment_status_coupon_
// discount_idempotency/migration.sql added Order.paymentStatus with
// `DEFAULT 'Pending'`, which Postgres backfilled onto every row that
// already existed — including the 10 seed/demo orders created by
// prisma/seed.ts (lib/admin/mock-data.ts's ADMIN_MOCK_ORDERS and lib/
// services/mock-order-service.ts's DEMO_SEED_ORDERS), none of which have
// ever been real customer transactions or gone through Razorpay. A
// read-only audit confirmed:
//   - All 10 have paymentMethod != cod, paymentStatus = Pending, and no
//     razorpayOrderId — a combination that, for a REAL order, would only
//     ever mean "abandoned checkout." For these specific rows it's purely
//     a migration-default artifact: 9 of them have fulfillment already at
//     Delivered/Shipped/OutForDelivery/Cancelled, which this app's real
//     checkout flow could never reach on a non-COD order without payment
//     having succeeded first.
//   - The 10th, NUC-20039, is still at fulfillment status Confirmed — no
//     shipment progress at all — which is genuinely indistinguishable from
//     an abandoned checkout. Its payment status was deliberately NOT
//     inferred from fulfillment and is intentionally left untouched by
//     both this script and lib/admin/mock-data.ts's seed entry.
//
// This script applies the approved correction (see the repair table
// below) to the 9 resolved rows only. It:
//   - Never invents a razorpayOrderId/razorpayPaymentId — these stay null,
//     because these orders were never actually processed by Razorpay and
//     must never be made to look like they were.
//   - Targets rows strictly by an explicit orderNumber allowlist — no
//     broad UPDATE ever runs.
//   - Requires every target to currently be Pending; if any target is
//     missing or in some OTHER unexpected state (not Pending, and not
//     already exactly the proposed correction), it aborts before writing
//     anything.
//   - Is idempotent: a row that's already exactly the proposed correction
//     is recognized and skipped, not treated as an error — safe to re-run.
//   - Applies all pending corrections inside one transaction, each write
//     individually guarded by `WHERE orderNumber = ? AND paymentStatus =
//     'Pending'` — if that guard ever matches zero rows at apply time
//     (a race since the pre-flight check), the whole transaction throws
//     and rolls back rather than partially applying.
//   - Touches ONLY Order.paymentStatus and Order.paidAt. Never
//     OrderItems, ProductVariant.stock, Coupon.usageCount, Order.status
//     (fulfillment), customer data, or any Razorpay field.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import type { OrderPaymentStatus as PrismaOrderPaymentStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'

interface RepairTarget {
  orderNumber: string
  paymentStatus: PrismaOrderPaymentStatus
  /** ISO string, or null for Failed. */
  paidAt: string | null
  reason: string
}

// The approved repair table — see this file's own header and the prior
// audit conversation for the full reasoning behind each row. NUC-20039 is
// deliberately NOT in this list.
const REPAIR_TABLE: RepairTarget[] = [
  { orderNumber: 'NUC-20031', paymentStatus: 'Paid', paidAt: '2026-08-12T09:15:00.000Z', reason: 'Delivered (upi)' },
  { orderNumber: 'NUC-20032', paymentStatus: 'Paid', paidAt: '2026-08-18T13:40:00.000Z', reason: 'Delivered (card)' },
  { orderNumber: 'NUC-20033', paymentStatus: 'Failed', paidAt: null, reason: 'Cancelled (card) — conservative: no evidence payment was ever captured' },
  { orderNumber: 'NUC-20034', paymentStatus: 'Paid', paidAt: '2026-09-02T16:20:00.000Z', reason: 'Shipped (netbanking)' },
  { orderNumber: 'NUC-20035', paymentStatus: 'Paid', paidAt: '2026-09-05T10:00:00.000Z', reason: 'Delivered (upi)' },
  { orderNumber: 'NUC-20037', paymentStatus: 'Paid', paidAt: '2026-09-12T08:50:00.000Z', reason: 'Out for Delivery (card)' },
  { orderNumber: 'NUC-20038', paymentStatus: 'Paid', paidAt: '2026-09-14T17:10:00.000Z', reason: 'Shipped (upi)' },
  { orderNumber: 'NUC-10001', paymentStatus: 'Paid', paidAt: '2026-08-20T10:30:00.000Z', reason: 'Delivered (upi), demo account order' },
  { orderNumber: 'NUC-10002', paymentStatus: 'Paid', paidAt: '2026-09-10T15:45:00.000Z', reason: 'Shipped (card), demo account order' },
]

type RowClassification = 'ready' | 'already-applied' | 'not-found' | 'anomaly'

interface ClassifiedRow {
  target: RepairTarget
  classification: RowClassification
  currentPaymentStatus: PrismaOrderPaymentStatus | null
  currentPaidAt: Date | null
  detail: string
}

function paidAtMatches(current: Date | null, expected: string | null): boolean {
  if (expected === null) return current === null
  return current !== null && current.toISOString() === new Date(expected).toISOString()
}

async function classifyRows(): Promise<ClassifiedRow[]> {
  const orderNumbers = REPAIR_TABLE.map((t) => t.orderNumber)
  const rows = await prisma.order.findMany({
    where: { orderNumber: { in: orderNumbers } },
    select: { orderNumber: true, paymentStatus: true, paidAt: true },
  })
  const byOrderNumber = new Map(rows.map((r) => [r.orderNumber, r]))

  return REPAIR_TABLE.map((target): ClassifiedRow => {
    const existing = byOrderNumber.get(target.orderNumber)

    if (!existing) {
      return {
        target,
        classification: 'not-found',
        currentPaymentStatus: null,
        currentPaidAt: null,
        detail: 'No Order row with this orderNumber exists.',
      }
    }

    if (existing.paymentStatus === 'Pending') {
      return {
        target,
        classification: 'ready',
        currentPaymentStatus: existing.paymentStatus,
        currentPaidAt: existing.paidAt,
        detail: 'Currently Pending — eligible for correction.',
      }
    }

    if (existing.paymentStatus === target.paymentStatus && paidAtMatches(existing.paidAt, target.paidAt)) {
      return {
        target,
        classification: 'already-applied',
        currentPaymentStatus: existing.paymentStatus,
        currentPaidAt: existing.paidAt,
        detail: 'Already matches the proposed correction — safe to skip (idempotent re-run).',
      }
    }

    return {
      target,
      classification: 'anomaly',
      currentPaymentStatus: existing.paymentStatus,
      currentPaidAt: existing.paidAt,
      detail: `Unexpected state: paymentStatus=${existing.paymentStatus}, paidAt=${existing.paidAt?.toISOString() ?? 'null'} — neither Pending nor the proposed correction. Something else changed this order since the repair was prepared.`,
    }
  })
}

function printPreflightTable(rows: ClassifiedRow[]): void {
  console.log('')
  console.log('=== PRE-FLIGHT: current state of every target row ===')
  for (const row of rows) {
    console.log(
      `  ${row.target.orderNumber.padEnd(14)} classification=${row.classification.padEnd(16)} ` +
        `current=(${row.currentPaymentStatus ?? 'n/a'}, paidAt=${row.currentPaidAt?.toISOString() ?? 'null'}) ` +
        `proposed=(${row.target.paymentStatus}, paidAt=${row.target.paidAt ?? 'null'})`
    )
    console.log(`    ${row.detail}`)
  }
  console.log('')
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  const classified = await classifyRows()
  printPreflightTable(classified)

  const notFound = classified.filter((r) => r.classification === 'not-found')
  const anomalies = classified.filter((r) => r.classification === 'anomaly')

  if (notFound.length > 0 || anomalies.length > 0) {
    console.error('=== ABORTED — no changes made ===')
    if (notFound.length > 0) {
      console.error(`  Not found (${notFound.length}): ${notFound.map((r) => r.target.orderNumber).join(', ')}`)
    }
    if (anomalies.length > 0) {
      console.error(`  Unexpected state (${anomalies.length}): ${anomalies.map((r) => r.target.orderNumber).join(', ')}`)
      console.error('  Every target must be either currently Pending or already exactly the proposed correction.')
      console.error('  Review these specific rows manually before re-running.')
    }
    process.exitCode = 1
    return
  }

  const ready = classified.filter((r) => r.classification === 'ready')
  const alreadyApplied = classified.filter((r) => r.classification === 'already-applied')

  if (ready.length === 0) {
    console.log('=== NOTHING TO DO — all target rows already match the proposed correction ===')
    console.log(`  Already correct: ${alreadyApplied.map((r) => r.target.orderNumber).join(', ')}`)
    return
  }

  console.log(`Preflight passed: ${ready.length} row(s) ready to update, ${alreadyApplied.length} already correct.`)

  if (dryRun) {
    console.log('')
    console.log('=== DRY RUN — would update the following, no changes made ===')
    for (const row of ready) {
      console.log(`  ${row.target.orderNumber} -> paymentStatus=${row.target.paymentStatus}, paidAt=${row.target.paidAt ?? 'null'}`)
    }
    return
  }

  const updated: string[] = []

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of ready) {
        const { target } = row
        // Narrow, individually-guarded update — never a broad UPDATE, and
        // the paymentStatus:'Pending' guard is what makes a race since the
        // pre-flight check safe: if this order was concurrently changed by
        // anything else (a real payment, another script run), this update
        // affects zero rows and we abort the whole transaction below
        // rather than silently overwriting whatever it became.
        const result = await tx.order.updateMany({
          where: { orderNumber: target.orderNumber, paymentStatus: 'Pending' },
          data: {
            paymentStatus: target.paymentStatus,
            paidAt: target.paidAt ? new Date(target.paidAt) : null,
          },
        })
        if (result.count !== 1) {
          throw new Error(
            `Race detected: ${target.orderNumber} was no longer Pending at apply time. Aborting the entire correction — no partial application.`
          )
        }
        updated.push(target.orderNumber)
      }
    })
  } catch (err) {
    console.error('')
    console.error('=== ABORTED MID-TRANSACTION — rolled back, no changes were committed ===')
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
    return
  }

  console.log('')
  console.log('=== DONE ===')
  console.log(`  Updated (${updated.length}): ${updated.join(', ')}`)
  console.log(`  Skipped, already correct (${alreadyApplied.length}): ${alreadyApplied.map((r) => r.target.orderNumber).join(', ') || 'none'}`)
  console.log('  Not touched: NUC-20039 (intentionally unresolved — not in the repair table), and every other order in the database.')
  console.log('  Fields touched: Order.paymentStatus, Order.paidAt only. No inventory, coupon, OrderItem, fulfillment status, or Razorpay field was written.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
