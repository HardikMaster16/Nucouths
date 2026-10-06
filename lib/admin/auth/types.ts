// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Admin Auth Types
//
// AdminUser is the shape returned by lib/admin/auth/admin-session.actions.ts
// (a Prisma User row, mapped and stripped of passwordHash) — never a raw
// database row.
//
// Deliberately a separate type from the customer User (lib/auth/types.ts) —
// an admin is not a customer account with a flag on it, and the two must
// never be conflated or cross-authenticated.
// ─────────────────────────────────────────────────────────────────────────────

/** Only 'admin' is used today. The union exists now so role-gating (e.g. a
 *  future "editor" who can't touch Settings) doesn't require widening this
 *  type later — AdminAuthContext and route guards already read `role`. */
export type AdminRole = 'admin' | 'manager' | 'editor' | 'support'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
}
