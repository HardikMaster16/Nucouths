// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Razorpay Webhook
//
// POST /api/webhooks/razorpay. This is a server-to-server endpoint, not a
// customer-facing one: it never reads or requires the customer session
// cookie (lib/auth/session.ts), and it never should — the webhook
// signature below is its ONLY authentication. Anyone who can forge that
// signature would need RAZORPAY_WEBHOOK_SECRET, which never leaves the
// server (see lib/razorpay.ts).
//
// Reconciles a payment Razorpay captured even if the customer's browser
// never completed lib/orders.actions.ts's verifyRazorpayPaymentAction (a
// dropped connection, a closed tab, a crashed client) — the one gap that
// path alone can't cover. It does NOT replace that path; both can fire for
// the same payment (whichever gets there first wins, the other is a
// harmless idempotent replay — see lib/razorpay-webhook.ts).
//
// Only handles the two events the existing Order lifecycle actually needs:
//   - payment.captured: may transition Pending → Paid (see
//     applyRazorpayPaymentCaptured's own docstring for the full guarantee).
//   - payment.failed: deliberately a no-op. The browser-side flow already
//     treats a failed/cancelled attempt as "stay Pending, let the customer
//     retry against the same Razorpay order" (see CheckoutClient.tsx /
//     OrderDetailClient.tsx's "Retry Payment" / "Pay Now"). Recording
//     Failed here would fight that: a customer who retries and succeeds
//     right after would need a Failed → Paid transition our atomic guard
//     doesn't allow, and Razorpay orders routinely take more than one
//     attempt (a declined card, then a different one). So this event is
//     just acknowledged — Order.paymentStatus stays exactly what it was.
// Any other event (payment.authorized, order.paid, refund.*, …) is
// acknowledged the same way, without touching any order — this app has no
// flow that acts on them yet.
//
// This endpoint never creates an Order, never deducts inventory, and never
// consumes coupon usage — all three already happened (or didn't) during
// lib/orders.actions.ts's placeOrderAction, and nothing here re-runs any
// part of that.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay'
import { applyRazorpayPaymentCaptured } from '@/lib/razorpay-webhook'

interface RazorpayWebhookPayload {
  event?: string
  payload?: {
    payment?: {
      entity?: {
        id?: string
        order_id?: string
      }
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // The exact bytes Razorpay signed — req.json() would parse-then-discard
  // this, and re-serializing a parsed object is not guaranteed to
  // reproduce it (key order, whitespace), so the signature must be checked
  // against this raw string, never anything derived from it.
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('x-razorpay-signature')

  let signatureValid: boolean
  try {
    signatureValid = verifyRazorpayWebhookSignature(rawBody, signatureHeader)
  } catch (err) {
    // Not configured (RAZORPAY_WEBHOOK_SECRET missing) — a server problem,
    // not a bad request; never logs the secret itself, just that it's
    // absent.
    console.error('[razorpay webhook]', err instanceof Error ? err.message : 'misconfigured')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let event: RazorpayWebhookPayload
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  switch (event.event) {
    case 'payment.captured': {
      const razorpayPaymentId = event.payload?.payment?.entity?.id
      const razorpayOrderId = event.payload?.payment?.entity?.order_id
      if (!razorpayPaymentId || !razorpayOrderId) {
        return NextResponse.json({ error: 'Malformed payment.captured payload.' }, { status: 400 })
      }

      const outcome = await applyRazorpayPaymentCaptured({ razorpayOrderId, razorpayPaymentId })
      // Status + identifiers only — never the raw payload (amounts,
      // method details) and never a secret.
      console.log('[razorpay webhook] payment.captured', outcome.status, razorpayOrderId)
      return NextResponse.json({ status: 'ok' })
    }

    case 'payment.failed':
      // Deliberately a no-op — see this file's module docstring.
      return NextResponse.json({ status: 'ok' })

    default:
      // Valid, verified, but not an event this app acts on.
      return NextResponse.json({ status: 'ignored' })
  }
}
