// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Razorpay Webhook Reconciliation (Prisma, server-only)
//
// The business logic behind POST /api/webhooks/razorpay
// (app/api/webhooks/razorpay/route.ts), which owns every HTTP concern (raw
// body, header, signature verification, status codes) and calls into this
// file only AFTER the webhook signature has already been verified — nothing
// here re-checks that, and nothing here should ever be reachable from an
// unverified request.
//
// Deliberately does NOT reuse lib/orders.actions.ts's
// verifyRazorpayPaymentAction: that function requires a customer session
// (requireCustomerSession()) and browser-Checkout-shaped input (a
// razorpaySignature over "order_id|payment_id") — a Razorpay server-to-
// server webhook has neither, and manufacturing a fake session/signature
// to reuse it would be worse than the small duplication below. This module
// re-implements the same already-proven atomic Pending→Paid transition
// independently, so the browser-verification path (extensively tested
// already) is never touched by adding this webhook.
//
// No new schema field was needed for any of this: Order.razorpayOrderId
// (unique) is enough to find the exact order a webhook event is about —
// the ONLY lookup key used, so nothing else the payload might contain
// (Razorpay payloads carry no application userId anyway) can ever steer a
// write at the wrong order. razorpayPaymentId (unique) plus the atomic
// conditional update below is enough to make repeated delivery idempotent
// and to stop a different payment id from ever overwriting an already-paid
// order — the same guarantees the browser path already has. A separate
// "processed webhook events" table would be redundant on top of that, not
// genuinely necessary.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type WebhookPaymentCapturedOutcome =
  | { status: 'paid'; orderNumber: string }
  | { status: 'already-paid'; orderNumber: string }
  | { status: 'payment-id-conflict'; orderNumber: string }
  | { status: 'order-not-found' }

/** Applies a Razorpay `payment.captured` event to the application Order
 *  whose razorpayOrderId matches the event's own `payload.payment.entity.
 *  order_id` — trustworthy once the whole webhook payload has passed
 *  signature verification, since Razorpay itself ties a payment entity to
 *  its order (this app never has to cross-reference it against anything
 *  else). Safe to call repeatedly for the same event, since Razorpay's
 *  webhook delivery is at-least-once: the atomic conditional update can
 *  only apply once, and every later call for the same payment id is
 *  detected below and answered identically without writing anything. */
export async function applyRazorpayPaymentCaptured(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
}): Promise<WebhookPaymentCapturedOutcome> {
  const order = await prisma.order.findUnique({ where: { razorpayOrderId: input.razorpayOrderId } })
  if (!order) return { status: 'order-not-found' }

  if (order.paymentStatus === 'Paid') {
    return order.razorpayPaymentId === input.razorpayPaymentId
      ? { status: 'already-paid', orderNumber: order.orderNumber }
      : { status: 'payment-id-conflict', orderNumber: order.orderNumber }
  }

  // Atomic conditional transition — identical guard to lib/orders.
  // actions.ts's verifyRazorpayPaymentAction: only a row that's still
  // Pending and still has this exact razorpayOrderId can flip, so this
  // racing against a browser verification (or another duplicate webhook
  // delivery) can apply the transition at most once.
  let updateResult: { count: number }
  try {
    updateResult = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'Pending', razorpayOrderId: input.razorpayOrderId },
      data: { paymentStatus: 'Paid', razorpayPaymentId: input.razorpayPaymentId, paidAt: new Date() },
    })
  } catch (err) {
    // razorpayPaymentId is unique — this payment id is already attached to
    // a DIFFERENT order (e.g. a payload replaying another order's payment
    // id). Never let that surface as an unhandled 500; it's the same
    // "must not apply" outcome as any other payment-id conflict, and the
    // constraint itself is what guaranteed this order was never touched.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { status: 'payment-id-conflict', orderNumber: order.orderNumber }
    }
    throw err
  }
  if (updateResult.count === 1) return { status: 'paid', orderNumber: order.orderNumber }

  // Lost a race to a concurrent writer (the browser path or another
  // webhook delivery) — resolve the same way a direct retry would: the
  // same payment id landing first is a harmless replay, a different one
  // is a conflict this call must not apply over.
  const fresh = await prisma.order.findUnique({ where: { id: order.id } })
  if (fresh?.paymentStatus === 'Paid') {
    return fresh.razorpayPaymentId === input.razorpayPaymentId
      ? { status: 'already-paid', orderNumber: order.orderNumber }
      : { status: 'payment-id-conflict', orderNumber: order.orderNumber }
  }
  // Genuinely shouldn't happen (the row exists and razorpayOrderId is
  // never reassigned) — treat as a conflict rather than silently retrying
  // a write.
  return { status: 'payment-id-conflict', orderNumber: order.orderNumber }
}
