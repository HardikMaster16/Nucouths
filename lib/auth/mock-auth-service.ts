// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Demo Account Constant
//
// NOT an authentication service. Real customer authentication is
// lib/auth/customer-auth.actions.ts (Prisma-backed, bcrypt, httpOnly
// session cookie) — nothing here is consulted by login/register/logout,
// profile update, or password change.
//
// This file only still exists to export the one fictional demo account
// identity (DEMO_USER / DEMO_USER_ID) that the storefront's remaining mock
// data layers — lib/services/mock-order-service.ts, lib/services/
// mock-address-service.ts, prisma/seed.ts — key their seed data to. Those
// are out of scope for authentication cleanup; this constant is kept only
// because they still import it.
// ─────────────────────────────────────────────────────────────────────────────

import type { User } from './types'

export const DEMO_USER_ID = 'demo-user-001'

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  firstName: 'Hardik',
  lastName: 'Master',
  email: 'demo@neucouths.com',
  phone: '+91 98765 43210',
}
