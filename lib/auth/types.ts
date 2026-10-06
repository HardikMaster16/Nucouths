// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Auth Types
//
// `User` is the shape returned by lib/auth/customer-auth.actions.ts (a
// Prisma User row, mapped and stripped of passwordHash) — never a raw
// database row. useAuth() (lib/auth-context.tsx) exposes it as `AuthUser`.
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}
