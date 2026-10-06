// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Razorpay Checkout (browser-only)
//
// Shared by components/checkout/CheckoutClient.tsx (paying for a
// just-placed order) and components/account/OrderDetailClient.tsx ("Pay
// Now" on an existing Pending order — the retry path). Both only ever call
// payForOrder(); everything below is plumbing.
//
// payForOrder() never computes or sends an amount itself — it only relays
// orderNumber + whatever Razorpay Checkout itself returns to
// lib/orders.actions.ts's initializeRazorpayOrderAction /
// verifyRazorpayPaymentAction, which are the only places that read the
// authoritative amount (initialize) or decide whether a payment is real
// (verify). This file has no access to RAZORPAY_KEY_SECRET — it only ever
// sees the key id the initialize action hands back.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeRazorpayOrderAction, verifyRazorpayPaymentAction } from './orders.actions'

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

interface RazorpaySuccessResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayFailureResponse {
  error?: { description?: string }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

let scriptPromise: Promise<void> | null = null

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('script-load-failed')))
      return
    }
    const script = document.createElement('script')
    script.src = CHECKOUT_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('script-load-failed'))
    document.body.appendChild(script)
  })
  return scriptPromise
}

export interface RazorpayPrefill {
  name: string
  email: string
  contact: string
}

export type PayForOrderOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string }
  | { status: 'error'; message: string }

/** Runs the full pay-for-an-order flow: ask the server to initialize (or
 *  reuse) a Razorpay Order for this application Order, open Razorpay
 *  Checkout with exactly what it returned, and — only on Checkout's own
 *  success callback — ask the server to verify the payment. The caller
 *  (CheckoutClient or OrderDetailClient) just renders the returned
 *  `PayForOrderOutcome`; neither ever sees or handles Razorpay identifiers
 *  directly. Safe to call again after 'cancelled'/'failed'/'error' — it's
 *  the same retry path either caller uses. */
export async function payForOrder(orderNumber: string, prefill: RazorpayPrefill): Promise<PayForOrderOutcome> {
  const init = await initializeRazorpayOrderAction(orderNumber)
  if (!init.success) {
    return { status: 'error', message: init.error ?? 'Could not start payment. Please try again.' }
  }
  if (init.alreadyPaid) return { status: 'success' }
  if (!init.razorpayOrderId || !init.amount || !init.currency || !init.keyId) {
    return { status: 'error', message: 'Could not start payment. Please try again.' }
  }

  try {
    await loadRazorpayScript()
  } catch {
    return { status: 'error', message: 'Could not load the payment gateway. Please check your connection and try again.' }
  }

  if (!window.Razorpay) {
    return { status: 'error', message: 'Could not load the payment gateway. Please check your connection and try again.' }
  }

  return new Promise((resolve) => {
    const razorpay = new window.Razorpay!({
      key: init.keyId!,
      amount: init.amount!,
      currency: init.currency!,
      name: 'Nucouths',
      description: `Order ${orderNumber}`,
      order_id: init.razorpayOrderId!,
      prefill,
      theme: { color: '#1a1a1a' },
      handler: (response) => {
        void (async () => {
          const verify = await verifyRazorpayPaymentAction({
            orderNumber,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
          resolve(
            verify.success
              ? { status: 'success' }
              : { status: 'error', message: verify.error ?? 'We could not verify your payment. Please contact support.' }
          )
        })()
      },
      modal: {
        ondismiss: () => resolve({ status: 'cancelled' }),
      },
    })

    razorpay.on('payment.failed', (response) => {
      resolve({ status: 'failed', message: response.error?.description ?? 'Payment failed. Please try again.' })
    })

    razorpay.open()
  })
}
