// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Razorpay (server-only)
//
// Thin wrapper around Razorpay's REST API and signature schemes via raw
// fetch/crypto — simple enough not to warrant adding the `razorpay` npm
// package as a dependency. Imported only from lib/orders.actions.ts's
// Server Actions (the browser-Checkout path) and
// app/api/webhooks/razorpay/route.ts (the server-to-server webhook path) —
// never from a 'use client' component.
//
// RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are read from
// process.env and used only for the Basic Auth header (order creation) and
// HMAC signing (the two signature verifiers below) — neither is ever
// returned to a caller, logged, or otherwise exposed. getRazorpayKeyId()
// is the one exception: RAZORPAY_KEY_ID is the public half of the API key
// pair, required client-side by Razorpay Checkout itself, and safe to hand
// back to the browser. The webhook secret has no client-facing counterpart
// at all — nothing here ever exposes it.
//
// Deliberately no insecure "dev fallback" secret for either (unlike
// lib/auth/session.ts's session-signing secrets) — a guessable/hardcoded
// fallback here would let anyone forge a valid-looking payment signature
// or webhook delivery, so a missing credential is a hard failure, never a
// silently-substituted one.
//
// getCredentials() also refuses to proceed if RAZORPAY_KEY_ID's mode
// (rzp_test_/rzp_live_ prefix) doesn't match NODE_ENV — see
// assertRazorpayKeyMatchesEnvironment below.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto'

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1'

// Razorpay key ids are always prefixed rzp_test_ or rzp_live_ (Razorpay's
// own documented convention) — using a live key outside production, or a
// test key in production, is almost always a misconfigured environment,
// not an intentional choice. Fails loudly rather than silently proceeding
// with whichever key was found, since a live key that leaks into staging
// (or a test key that reaches production) would either move real money in
// a non-production environment or quietly stop accepting real payments.
function assertRazorpayKeyMatchesEnvironment(keyId: string): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const isLiveKey = keyId.startsWith('rzp_live_')
  const isTestKey = keyId.startsWith('rzp_test_')

  if (isProduction && isTestKey) {
    throw new Error(
      'RAZORPAY_KEY_ID is a test-mode key (rzp_test_...) but NODE_ENV=production. Refusing to process payments — set a live-mode key for production.'
    )
  }
  if (!isProduction && isLiveKey) {
    throw new Error(
      'RAZORPAY_KEY_ID is a live-mode key (rzp_live_...) outside production (NODE_ENV=' +
        (process.env.NODE_ENV ?? 'undefined') +
        '). Refusing to process payments — use a test-mode key outside production.'
    )
  }
}

function getCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')
  }
  assertRazorpayKeyMatchesEnvironment(keyId)
  return { keyId, keySecret }
}

/** Safe to expose to the browser — Razorpay Checkout requires the key id
 *  client-side. Never returns the secret. */
export function getRazorpayKeyId(): string {
  return getCredentials().keyId
}

export interface CreateRazorpayOrderInput {
  /** Always Math.round(order.total * 100) from the authoritative Prisma
   *  Order row — callers never pass anything derived from client input. */
  amountInPaise: number
  currency: string
  receipt: string
}

export interface RazorpayOrder {
  id: string
}

/** Creates a Razorpay Order via the REST API, authenticated with HTTP Basic
 *  Auth (key_id:key_secret) — Razorpay's documented server-to-server auth
 *  scheme for this endpoint. `payment_capture: 1` auto-captures a
 *  successfully authorized payment immediately (Razorpay's standard
 *  "capture on authorization" mode) rather than leaving it in a separate
 *  authorized-but-uncaptured state this app has no flow to act on. */
export async function createRazorpayOrder(input: CreateRazorpayOrderInput): Promise<RazorpayOrder> {
  const { keyId, keySecret } = getCredentials()
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: input.amountInPaise,
      currency: input.currency,
      receipt: input.receipt,
      payment_capture: 1,
    }),
  })

  if (!res.ok) {
    // Status only — never log the response body verbatim (Razorpay error
    // payloads can echo back request details that don't belong in logs).
    throw new Error(`Razorpay order creation failed (HTTP ${res.status}).`)
  }

  const data = (await res.json()) as { id: string }
  return { id: data.id }
}

export interface VerifyRazorpaySignatureInput {
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}

const HEX64_RE = /^[0-9a-f]{64}$/i

function timingSafeHexEqual(expectedHex: string, actual: string): boolean {
  if (!HEX64_RE.test(actual)) return false
  const expectedBuf = Buffer.from(expectedHex, 'hex')
  const actualBuf = Buffer.from(actual.toLowerCase(), 'hex')
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)
}

/** Razorpay's documented Checkout signature scheme: HMAC-SHA256 of
 *  "{razorpay_order_id}|{razorpay_payment_id}", keyed with the account's
 *  key_secret, compared as a hex digest. This is what
 *  verifyRazorpayPaymentAction (the browser-Checkout verification path)
 *  uses — every caller must treat a `false` return as "not verified,"
 *  never partially trust a client-reported success. */
export function verifyRazorpaySignature(input: VerifyRazorpaySignatureInput): boolean {
  const { keySecret } = getCredentials()
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex')
  return timingSafeHexEqual(expected, input.signature)
}

/** Razorpay's documented WEBHOOK signature scheme — distinct from Checkout's
 *  above: HMAC-SHA256 of the entire raw request body (not "order_id|
 *  payment_id"), keyed with the webhook's own secret (RAZORPAY_WEBHOOK_SECRET
 *  — configured separately in the Razorpay dashboard's webhook settings,
 *  never the same value as RAZORPAY_KEY_SECRET unless Razorpay's own UI
 *  happens to have been given the same string for both, which this code
 *  never assumes). `rawBody` must be the exact, unparsed request body
 *  string — verifying against a JSON.parse()'d-and-re-stringified payload
 *  would not reproduce the bytes Razorpay actually signed and could reject
 *  genuine deliveries or, worse, accept a tampered one whose re-
 *  serialization happens to match. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('Razorpay webhook is not configured — set RAZORPAY_WEBHOOK_SECRET.')
  }

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
  return timingSafeHexEqual(expected, signature)
}
