// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Password Hashing
//
// Server-only. bcrypt (via bcryptjs — pure JS, no native build step) with a
// cost factor of 12. Never imported by a client component; only
// lib/auth/customer-auth.actions.ts calls this, and only ever with a
// plaintext password that's about to be hashed or a hash that's about to be
// compared against — the plaintext is never logged, stored, or returned.
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS)
}

/** Never throws on a malformed/missing hash (e.g. a seeded user with no
 *  password set yet) — treats that the same as "wrong password" rather than
 *  letting an error leak whether the account has a usable password. */
export async function verifyPassword(plaintext: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false
  try {
    return await bcrypt.compare(plaintext, hash)
  } catch {
    return false
  }
}
