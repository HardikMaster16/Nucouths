// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Mock Address Seed Data
//
// ⚠️ TEMPORARY DEVELOPMENT DATA. One fictional saved address for the demo
// account (demo-user-001) only, so /account/addresses has something to show
// immediately after a demo login rather than starting empty. This is seed
// data for the *first* read only — lib/address-context.tsx persists it to
// localStorage on first load and all normal CRUD (edit/delete/set default)
// works on it exactly like any address the customer adds themselves.
// ─────────────────────────────────────────────────────────────────────────────

import { DEMO_USER, DEMO_USER_ID } from '@/lib/auth/mock-auth-service'
import type { Address } from '@/lib/types'

const SEEDED_AT = '2026-08-01T09:00:00.000Z'

const DEMO_SEED_ADDRESSES: Record<string, Address[]> = {
  [DEMO_USER_ID]: [
    {
      id: 'addr-demo-001',
      userId: DEMO_USER_ID,
      label: 'Home',
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      phone: DEMO_USER.phone,
      address: '12, Sunrise Residency, Ghod Dod Road',
      city: 'Surat',
      state: 'Gujarat',
      pinCode: '395007',
      country: 'India',
      isDefault: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
  ],
}

/** Fictional starter address for a given customer, or [] if this mock system
 *  has none defined for them (true for every account except the demo one). */
export function getSeedAddressesForUser(userId: string): Address[] {
  return DEMO_SEED_ADDRESSES[userId] ?? []
}
