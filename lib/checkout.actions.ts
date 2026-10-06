'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Checkout Actions (Prisma, server-only)
//
// The one Server Action checkout's client-side address picker calls.
// Derives the customer from requireCustomerSession() and re-checks
// ownership of the requested address server-side — an address id is only
// ever a reference the client passes to say "use this one", never trusted
// as proof of ownership by itself (same "send a reference, re-verify
// server-side" pattern every other customer-data action in this app uses).
// Returns "not found" (never a different error) for another customer's
// address id, so its existence is never confirmed or denied to the caller.
// ─────────────────────────────────────────────────────────────────────────────

import { requireCustomerSession } from './auth/customer-auth.actions'
import { dbAddressToAddress } from './addresses.db'
import { prisma } from '@/lib/prisma'
import type { Address } from './types'

export interface SelectAddressResult {
  success: boolean
  error?: string
  address?: Address
}

export async function selectCheckoutAddressAction(addressId: string): Promise<SelectAddressResult> {
  const customer = await requireCustomerSession()

  const row = await prisma.address.findFirst({ where: { id: addressId, userId: customer.id } })
  if (!row) return { success: false, error: 'Address not found.' }

  return { success: true, address: dbAddressToAddress(row) }
}
