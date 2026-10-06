'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Server-Side Admin Session (Prisma)
//
// Real, Prisma-backed admin authentication — mirrors lib/auth/customer-
// auth.actions.ts's structure exactly, scoped to User rows with
// role:'admin' instead of role:'customer'. Every export here:
//   - Never trusts a client-supplied id/role — identity always comes from
//     a database lookup: by email (login, scoped to role:'admin') or by
//     the signed session cookie's own id (requireAdminSession, re-scoped
//     to role:'admin' again on every call).
//   - Never returns passwordHash — every return value is a hand-built
//     AdminUser object, never a spread of the raw Prisma row.
//   - Uses the exact same bcrypt hashing (lib/auth/password.ts) the
//     customer system already uses — one password-hashing implementation,
//     not two, and not the old mock service's unsalted SHA-256.
//
// This cookie (ADMIN_SESSION_COOKIE) remains entirely separate from the
// customer session cookie — different name, different signing secret
// (lib/admin/auth/session.ts vs lib/auth/session.ts) — a customer session
// can never satisfy requireAdminSession() and vice versa.
//
// requireAdminSession()'s signature/behavior is unchanged from before this
// rewrite — every lib/admin/*.actions.ts and lib/banners.actions.ts caller
// needed no changes.
//
// Provisioning: there is no login UI for *creating* an admin account (by
// design — see scripts/create-admin.ts) and no hardcoded credential
// anywhere in this file or the database schema. An admin row is just a
// User row with role='admin' and a bcrypt passwordHash, created once via
// that script.
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  computePasswordFingerprint,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from './session'
import { isRequired } from '@/lib/checkout-validation'
import { clearLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from '@/lib/auth/login-rate-limit'
import type { AdminUser } from './types'

export interface AdminSessionActionResult {
  success: boolean
  error?: string
  admin?: AdminUser
}

function toAdminUser(user: { id: string; firstName: string; lastName: string; email: string }): AdminUser {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim() || user.email,
    email: user.email,
    role: 'admin',
  }
}

/** `passwordHash` is always the admin's real, just-verified hash by the
 *  time the one caller below reaches this — see lib/auth/session.ts's
 *  module docstring for the full session-revocation reasoning. */
async function setAdminSessionCookie(adminId: string, passwordHash: string | null): Promise<void> {
  const store = await cookies()
  const fingerprint = computePasswordFingerprint(passwordHash ?? '')
  store.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(adminId, fingerprint), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })
}

const GENERIC_LOGIN_ERROR = 'Invalid email or password.'
const RATE_LIMIT_ERROR = 'Too many attempts. Please try again in a few minutes.'

/** "admin:" prefixed so this can never collide with a customer login
 *  attempt against the same email (lib/auth/customer-auth.actions.ts keeps
 *  its own "customer:" prefix on the same shared, in-memory limiter — see
 *  lib/auth/login-rate-limit.ts's module docstring). */
function adminRateLimitKey(normalizedEmail: string): string {
  return `admin:${normalizedEmail}`
}

/** Queries the database by email (scoped to role:'admin') and verifies the
 *  bcrypt hash — the same "unconditionally compare, even against an
 *  undefined hash, so a nonexistent email and a wrong password take
 *  observably similar time" pattern lib/auth/customer-auth.actions.ts's
 *  loginCustomerAction uses. Never reveals whether the email exists, and
 *  never distinguishes "no such admin" from "wrong password". */
export async function adminLoginAction(email: string, password: string): Promise<AdminSessionActionResult> {
  if (!isRequired(email) || !isRequired(password)) {
    return { success: false, error: GENERIC_LOGIN_ERROR }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const rateLimitKey = adminRateLimitKey(normalizedEmail)

  // Checked before any database/bcrypt work — an attacker already over the
  // limit shouldn't cost a real password comparison per request.
  if (isLoginRateLimited(rateLimitKey)) {
    return { success: false, error: RATE_LIMIT_ERROR }
  }

  try {
    const user = await prisma.user.findFirst({ where: { email: normalizedEmail, role: 'admin' } })
    const passwordOk = await verifyPassword(password, user?.passwordHash)

    if (!user || !passwordOk) {
      recordFailedLoginAttempt(rateLimitKey)
      return { success: false, error: GENERIC_LOGIN_ERROR }
    }

    clearLoginAttempts(rateLimitKey)
    await setAdminSessionCookie(user.id, user.passwordHash)
    return { success: true, admin: toAdminUser(user) }
  } catch {
    return { success: false, error: GENERIC_LOGIN_ERROR }
  }
}

export async function adminLogoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(ADMIN_SESSION_COOKIE)
}

/** Every admin mutation (lib/admin/*.actions.ts, lib/banners.actions.ts)
 *  and every admin read (lib/admin/*.db.ts, lib/banners.db.ts) calls this
 *  first, unconditionally. Reads the httpOnly session cookie — never a
 *  client-supplied id/role — and throws when it's missing, tampered,
 *  expired, doesn't resolve to a real User row with role:'admin', or
 *  carries a password fingerprint that no longer matches that row's
 *  current passwordHash (see lib/auth/session.ts's module docstring for
 *  why that's a revocation mechanism). Callers let this error propagate;
 *  the admin UI already renders a generic "couldn't save"/error-boundary
 *  message for any thrown error. */
export async function requireAdminSession(): Promise<AdminUser> {
  const store = await cookies()
  const session = verifyAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value)
  if (!session) throw new Error('Unauthorized — please sign in as an admin and try again.')

  const user = await prisma.user.findFirst({ where: { id: session.adminId, role: 'admin' } })
  if (!user) throw new Error('Unauthorized — please sign in as an admin and try again.')
  if (computePasswordFingerprint(user.passwordHash ?? '') !== session.passwordFingerprint) {
    throw new Error('Unauthorized — please sign in as an admin and try again.')
  }

  return toAdminUser(user)
}

/** Non-throwing variant of requireAdminSession() — for the client-side
 *  hydration in lib/admin/admin-auth-context.tsx, which wants to know "is
 *  anyone signed in as admin right now" without treating "no" as an error. */
export async function getCurrentAdminAction(): Promise<AdminUser | null> {
  try {
    return await requireAdminSession()
  } catch {
    return null
  }
}
