// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Pending Order Expiration Endpoint
//
// GET or POST /api/cron/expire-pending-orders. Not customer- or admin-
// session-gated (an external scheduler has neither cookie) — a shared
// secret (CRON_SECRET) is the only authentication, the same "the signature/
// secret IS the auth" pattern the Razorpay webhook already uses. No
// customer session, no admin session, no client-supplied order/user id is
// ever read here; the actual work (lib/order-expiration.ts's
// expirePendingOrders) only ever operates on server-computed candidates.
//
// This process does not run automatically — see this repo's deployment
// notes for exactly what to configure in Hostinger's Cron Jobs panel (or
// any other external scheduler) to call this endpoint periodically. There
// is no in-process timer/interval here on purpose: this app isn't assumed
// to run as a single long-lived Node process, so scheduling must live
// outside it.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { expirePendingOrders } from '@/lib/order-expiration'

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf)
}

/** Accepts the secret either as `Authorization: Bearer <secret>` (preferred
 *  — use this when the scheduler supports custom headers) or a `?secret=`
 *  query param (for simpler schedulers that only let you configure a URL,
 *  e.g. a plain `wget`/`curl` cron command). Either way it's compared with
 *  a constant-time check, never a plain `===`. */
function hasValidCronSecret(req: NextRequest): boolean {
  const configured = process.env.CRON_SECRET
  if (!configured) return false

  const authHeader = req.headers.get('authorization')
  if (authHeader && timingSafeStringEqual(authHeader, `Bearer ${configured}`)) return true

  const querySecret = req.nextUrl.searchParams.get('secret')
  if (querySecret && timingSafeStringEqual(querySecret, configured)) return true

  return false
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    console.error('[cron/expire-pending-orders] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 })
  }

  if (!hasValidCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const result = await expirePendingOrders()
  return NextResponse.json({ status: 'ok', ...result })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}
