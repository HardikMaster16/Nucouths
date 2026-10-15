// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Pending Order Expiration (Prisma, server-only)
//
// Releases the stock (and coupon usage, if any) reserved by an abandoned
// ONLINE-payment order — one that's been paymentStatus=Pending for longer
// than PENDING_ORDER_EXPIRY_MINUTES with no Razorpay payment ever
// confirmed. Deliberately scoped to online payment methods only
// (paymentMethod != cod): a COD order is *supposed* to sit at Pending for
// as long as delivery takes (payment is collected on arrival, not via
// Razorpay) — expiring one would incorrectly cancel a perfectly normal,
// still-in-progress order and release stock that's actually spoken for.
//
// An expired order becomes fully terminal — paymentStatus: Failed AND
// status: Cancelled, written together in expireOneOrder's one atomic
// claim below. Status used to stay at Confirmed, which left an expired
// order looking exactly like any other live order to lib/admin/
// orders.db.ts's updateOrderStatusInDb: an admin cancelling it later would
// pass that function's own `status != 'Cancelled'` claim guard and restore
// the already-released stock a second time. Claiming status: Cancelled
// here means that guard now rejects it like any other already-cancelled
// order, with no change needed on the cancellation side.
//
// Order age: this schema has no separate "createdAt" — Order.placedAt
// (@default(now()), set once at creation, never updated) already is that
// timestamp, so it's reused as-is rather than adding a redundant field.
//
// Expiration threshold: no existing business duration was defined anywhere
// in this codebase for "how long a Pending online payment stays valid," so
// PENDING_ORDER_EXPIRY_MINUTES is a new, documented, configurable env var
// (see getPendingOrderExpiryMinutes below for its default and validation).
//
// No schema change was needed for any of this: Order.placedAt (already
// indexed), Order.paymentStatus, Order.couponId, and OrderItem.variantId/
// quantity (the exact snapshot of what was actually deducted) are already
// everything required to find candidates and safely reverse their effect.
//
// CONCURRENCY — this is the part that matters most. Expiring an order and
// verifying its payment (lib/orders.actions.ts's verifyRazorpayPaymentAction,
// or lib/razorpay-webhook.ts's applyRazorpayPaymentCaptured) can run at the
// same time. Both this file's claimOrderForExpiration() and both of those
// functions' Pending→Paid transitions use the exact same shape of atomic
// conditional update:
//
//   UPDATE "Order" SET ... WHERE id = ? AND paymentStatus = 'Pending'
//
// Whichever one commits first wins — Postgres serializes the two UPDATEs
// on the row's lock, so the second one's WHERE clause is re-evaluated
// against the row the first one already changed and matches zero rows.
// That means:
//   - If payment verification wins, paymentStatus is already 'Paid' by the
//     time expireOrder() tries to claim it, so its own conditional update
//     matches nothing, it aborts, and NO stock is ever touched.
//   - If expiration wins, paymentStatus is already 'Failed' by the time a
//     verification call's own conditional update runs, so THAT matches
//     nothing too — verifyRazorpayPaymentAction and
//     applyRazorpayPaymentCaptured already both fall through to a safe
//     "not verified"/conflict response in that case (see their own
//     fallback branches), so neither of them needed to change for this.
//     The one place that DID need a change is
//     lib/orders.actions.ts's initializeRazorpayOrderAction, which now
//     refuses to reopen Checkout for anything but a Pending order — so a
//     customer can't even attempt to pay for stock that's already been
//     released.
// Neither side ever needs to read-then-branch on the other's state; the
// database's own row lock is the only coordination mechanism, exactly like
// every other money/stock transition already in this codebase.
// ─────────────────────────────────────────────────────────────────────────────

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const DEFAULT_PENDING_ORDER_EXPIRY_MINUTES = 30

/** Not a secret, so an unset/invalid value falls back to a sane default
 *  rather than hard-failing (unlike the Razorpay credentials) — an
 *  expiration sweep simply finding nothing to do is always safe. */
export function getPendingOrderExpiryMinutes(): number {
  const raw = process.env.PENDING_ORDER_EXPIRY_MINUTES
  if (!raw) return DEFAULT_PENDING_ORDER_EXPIRY_MINUTES
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PENDING_ORDER_EXPIRY_MINUTES
}

/** The exact eligibility rule, shared verbatim by the candidate scan and
 *  the atomic per-order claim so they can never drift apart:
 *
 *   - paymentStatus: 'Pending' — the only state this ever touches.
 *   - paymentMethod not 'cod' — COD's Pending is a normal, long-lived
 *     "unpaid until delivery" state, not an abandoned checkout.
 *   - status: 'Confirmed' — an order whose fulfillment has progressed at
 *     all obviously wasn't abandoned. This is what keeps this sweep from
 *     ever touching pre-existing/legacy Order rows that predate Razorpay
 *     integration entirely and whose paymentStatus is simply a
 *     migration-default artifact, not a real payment state — verified the
 *     hard way against this repo's own seed data, which has real
 *     Delivered/Shipped/Cancelled orders sitting at paymentStatus=Pending
 *     or Failed purely because those columns didn't exist when they were
 *     created; none of them is ever 'Confirmed'.
 *   - placedAt older than the cutoff — the configured expiry window.
 *
 *   razorpayOrderId is deliberately NOT part of this filter. A null
 *   razorpayOrderId does not mean "not really an online-payment checkout"
 *   — it means initializeRazorpayOrderAction (called immediately after
 *   placeOrderAction, see CheckoutClient) never got far enough to write
 *   one: a dropped connection, a closed tab, or Razorpay's own order-
 *   creation API call failing. That order already holds reserved stock
 *   (placeOrderAction decrements it before payment is ever attempted) and
 *   is just as abandoned as one that made it to Checkout and was never
 *   paid — requiring razorpayOrderId here previously meant it could never
 *   be reclaimed, a permanent stock leak. The placedAt + status +
 *   paymentStatus + paymentMethod conditions above already uniquely
 *   identify an abandoned online-payment checkout without it.
 *
 *   No separate grace period was added for the brief window between
 *   placeOrderAction creating the order and initializeRazorpayOrderAction
 *   writing its razorpayOrderId: CheckoutClient calls the latter
 *   synchronously, in the same submit handler, immediately after the
 *   former resolves — that gap is two sequential HTTP round trips plus one
 *   Razorpay API call, realistically sub-second to a few seconds even
 *   under poor network conditions, never minutes. PENDING_ORDER_EXPIRY_
 *   MINUTES (default 30, see getPendingOrderExpiryMinutes below) already
 *   exceeds that by orders of magnitude, and the cron sweep itself only
 *   runs every 5–15 minutes (see DEPLOYMENT.md), so the earliest an order
 *   could even be scanned is well after initialization would have
 *   completed or definitively failed. An operator who configures an
 *   extremely small PENDING_ORDER_EXPIRY_MINUTES (sub-minute) could in
 *   theory reintroduce this race — that's a pre-existing misconfiguration
 *   risk of the threshold itself, not something specific to this check. */
function eligibilityFilter(cutoff: Date): Prisma.OrderWhereInput {
  return {
    paymentStatus: 'Pending',
    paymentMethod: { not: 'cod' },
    status: 'Confirmed',
    placedAt: { lt: cutoff },
  }
}

export type ExpireOrderOutcome =
  | { claimed: true; orderNumber: string; restoredVariantCount: number; releasedCoupon: boolean }
  | { claimed: false }

/** Expires exactly one order, entirely inside one transaction:
 *
 *   1. Atomically claims it — the ONLY write that may ever flip
 *      paymentStatus away from Pending for this purpose, guarded by the
 *      same three conditions the caller already filtered by (still
 *      Pending, still older than cutoff, still a non-COD method) so a
 *      stale/racing candidate can never be mis-expired. If this matches
 *      zero rows (already Paid, already expired by a concurrent sweep, or
 *      no longer eligible), everything below is skipped — no side effects.
 *
 *      Sets status to Cancelled in the SAME write as paymentStatus to
 *      Failed — an expired, never-paid non-COD checkout is a terminal,
 *      abandoned order, not a live Confirmed one, and leaving status at
 *      Confirmed left it looking like any other active order to
 *      lib/admin/orders.db.ts's updateOrderStatusInDb, whose own atomic
 *      claim only guards on `status != 'Cancelled'`. An admin cancelling
 *      such an order would pass that guard and restore its stock a SECOND
 *      time, on top of the restoration below — setting status to
 *      Cancelled here closes that gap for free: updateOrderStatusInDb's
 *      existing guard now rejects it like any other already-Cancelled
 *      order, with no change needed on that side.
 *   2. Re-reads the now-claimed order WITH its OrderItems (the immutable
 *      purchase-time snapshot — never the current cart, never current
 *      catalog quantities) to know exactly what to restore.
 *   3. Increments ProductVariant.stock by each item's own `quantity` — a
 *      plain additive update, which is race-free by construction (Postgres
 *      serializes concurrent increments on the same row; there's no
 *      "read-check-write" here to race in the first place, unlike the
 *      decrement path, which needs a `stock >= quantity` guard because it
 *      can invalidly go negative — an increment cannot).
 *   4. Releases one coupon usage, if this order actually consumed one,
 *      atomically and floor-guarded at zero (`usageCount: { gt: 0 }` in the
 *      WHERE) — never any other order's usage, since it's always this
 *      order's own `couponId`.
 *
 * Idempotent by construction: a second call for the same order (retried
 * sweep, or two concurrent sweeps racing each other) finds step 1 already
 * failed (order no longer Pending, and now also no longer Confirmed) and
 * does nothing further. */
async function expireOneOrder(orderId: string, cutoff: Date): Promise<ExpireOrderOutcome> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { id: orderId, ...eligibilityFilter(cutoff) },
      data: { paymentStatus: 'Failed', status: 'Cancelled' },
    })
    if (claim.count === 0) return { claimed: false }

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { select: { variantId: true, quantity: true } } },
    })

    let restoredVariantCount = 0
    for (const item of order.items) {
      // A deleted variant (ON DELETE SET NULL) has no row left to restore
      // stock to — nothing to do for that line.
      if (!item.variantId) continue
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      })
      restoredVariantCount++
    }

    let releasedCoupon = false
    if (order.couponId) {
      const released = await tx.coupon.updateMany({
        where: { id: order.couponId, usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      })
      releasedCoupon = released.count === 1
    }

    return { claimed: true, orderNumber: order.orderNumber, restoredVariantCount, releasedCoupon }
  })
}

export interface ExpirePendingOrdersResult {
  scanned: number
  expired: number
  expiredOrderNumbers: string[]
}

/** Finds every non-COD order still Pending past the configured expiry
 *  window and expires each one independently (one transaction per order —
 *  see expireOneOrder). The candidate scan itself is a plain read and
 *  needs no locking: every candidate is re-validated by its own atomic
 *  claim at expiry time, so a stale or duplicate candidate here is
 *  harmless. One order's unexpected failure doesn't stop the rest of the
 *  sweep. */
export async function expirePendingOrders(): Promise<ExpirePendingOrdersResult> {
  const cutoff = new Date(Date.now() - getPendingOrderExpiryMinutes() * 60_000)

  const candidates = await prisma.order.findMany({
    where: eligibilityFilter(cutoff),
    select: { id: true },
  })

  const expiredOrderNumbers: string[] = []
  for (const candidate of candidates) {
    try {
      const outcome = await expireOneOrder(candidate.id, cutoff)
      if (outcome.claimed) expiredOrderNumbers.push(outcome.orderNumber)
    } catch (err) {
      console.error('[order-expiration] failed to expire order', candidate.id, err instanceof Error ? err.message : err)
    }
  }

  return { scanned: candidates.length, expired: expiredOrderNumbers.length, expiredOrderNumbers }
}
