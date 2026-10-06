// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Address Reads (Prisma)
//
// Server-only. Imported only from lib/addresses.actions.ts's Server Actions
// — never from a 'use client' component, so Prisma is never pulled into a
// browser bundle. Every caller is responsible for having already resolved
// `userId` from requireCustomerSession() (lib/auth/customer-auth.actions.ts)
// — nothing here accepts or trusts a client-supplied userId itself.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { Address } from '@/lib/types'

export function dbAddressToAddress(row: Prisma.AddressGetPayload<object>): Address {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    firstName: row.firstName,
    lastName: row.lastName,
    address: row.address,
    apartment: row.apartment ?? undefined,
    city: row.city,
    state: row.state,
    pinCode: row.pinCode,
    country: row.country,
    phone: row.phone,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Default address first, then oldest to newest — same ordering
 *  lib/address-context.tsx's sortedAddresses already produces for the
 *  mock/localStorage path, so the UI sees identical ordering either way. */
export async function listAddressesForUser(userId: string): Promise<Address[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return rows.map(dbAddressToAddress)
}
