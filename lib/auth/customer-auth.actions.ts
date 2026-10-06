'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Authentication (Prisma)
//
// The real, server-side customer auth system: register/login/logout/session,
// backed by the existing Prisma User model. Every export here is a Server
// Action reachable directly as a POST endpoint, so:
//
//   - registerCustomerAction / loginCustomerAction never trust anything the
//     client sends beyond the credentials being submitted — identity is
//     always derived from what's looked up in the database, never echoed
//     back from client input.
//   - requireCustomerSession() is the ONLY way any future protected customer
//     operation should learn "who is this" — it reads the httpOnly session
//     cookie (lib/auth/session.ts), verifies its signature, and re-resolves
//     the user from the database by the id the cookie carries. A
//     client-supplied userId is never accepted as a substitute.
//   - This cookie (CUSTOMER_SESSION_COOKIE) is entirely separate from the
//     admin session cookie (lib/admin/auth/session.ts's
//     ADMIN_SESSION_COOKIE) — different name, different signing secret,
//     different verify function. A customer session can never satisfy
//     requireAdminSession(), and an admin session can never satisfy
//     requireCustomerSession(); each only recognizes its own cookie.
//   - No function here ever returns passwordHash — every return value is a
//     hand-built SafeCustomerUser object, never a spread of the raw Prisma
//     row.
//
// Validation reuses the exact functions the existing register/login forms
// already validate against client-side (lib/checkout-validation.ts's
// isRequired/isValidEmail/isValidIndianPhone, and RegisterClient.tsx's own
// 8-character password minimum) — re-run here as the authoritative,
// server-side check, per the Next.js Server Actions security guidance that
// a POST to this action isn't bound by the client's own validation.
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from './password'
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  computePasswordFingerprint,
  createCustomerSessionToken,
  verifyCustomerSessionToken,
} from './session'
import { isRequired, isValidEmail, isValidIndianPhone } from '@/lib/checkout-validation'
import { clearLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from './login-rate-limit'

export interface SafeCustomerUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface CustomerAuthResult {
  success: boolean
  error?: string
  user?: SafeCustomerUser
}

export interface RegisterCustomerInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
}

function toSafeCustomerUser(user: { id: string; firstName: string; lastName: string; email: string; phone: string | null }): SafeCustomerUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? '',
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** `passwordHash` is always the user's real, just-verified-or-just-created
 *  hash by the time any caller reaches this — never null in practice (see
 *  the module docstring's session-revocation section) — but the Prisma
 *  column itself is nullable, so callers pass what they have and this
 *  falls back to an empty string only for that theoretical legacy case
 *  (which would fail the very next fingerprint comparison anyway, exactly
 *  as a revoked session should). */
async function setCustomerSessionCookie(userId: string, passwordHash: string | null): Promise<void> {
  const store = await cookies()
  const fingerprint = computePasswordFingerprint(passwordHash ?? '')
  store.set(CUSTOMER_SESSION_COOKIE, createCustomerSessionToken(userId, fingerprint), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
  })
}

// ─── Register ───────────────────────────────────────────────────────────────

function validateRegistration(input: RegisterCustomerInput): string | null {
  if (!isRequired(input.firstName)) return 'First name is required.'
  if (!isRequired(input.lastName)) return 'Last name is required.'
  if (!isRequired(input.email)) return 'Email address is required.'
  if (!isValidEmail(input.email)) return 'Please enter a valid email address.'
  if (input.phone && input.phone.trim() && !isValidIndianPhone(input.phone)) return 'Please enter a valid phone number.'
  if (!isRequired(input.password)) return 'Password is required.'
  if (input.password.length < 8) return 'Password must contain at least 8 characters.'
  return null
}

export async function registerCustomerAction(input: RegisterCustomerInput): Promise<CustomerAuthResult> {
  const validationError = validateRegistration(input)
  if (validationError) return { success: false, error: validationError }

  const email = normalizeEmail(input.email)

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } })
      if (existing) return null

      const passwordHash = await hashPassword(input.password)
      return tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone?.trim() || null,
          role: 'customer',
        },
      })
    })

    if (!created) {
      // Deliberately the same generic wording pattern as login's failure —
      // this one specific case is fine to be explicit about (a live signup
      // form asking "is this email taken" is expected UX, unlike login
      // where confirming an email exists is an enumeration risk).
      return { success: false, error: 'An account with this email already exists.' }
    }

    await setCustomerSessionCookie(created.id, created.passwordHash)
    return { success: true, user: toSafeCustomerUser(created) }
  } catch {
    return { success: false, error: "Couldn't create your account. Please try again." }
  }
}

// ─── Login ──────────────────────────────────────────────────────────────────

const GENERIC_LOGIN_ERROR = 'Invalid email or password.'
const RATE_LIMIT_ERROR = 'Too many attempts. Please try again in a few minutes.'

/** Keyed by the normalized email being attempted, never by the account's
 *  real id (so a nonexistent email accumulates attempts exactly like a
 *  real one, revealing nothing about which is which) and prefixed so this
 *  can never collide with an admin login attempt against the same email
 *  (see lib/auth/login-rate-limit.ts's module docstring for why this is
 *  in-memory/per-identifier rather than IP-based). */
function customerRateLimitKey(normalizedEmail: string): string {
  return `customer:${normalizedEmail}`
}

export async function loginCustomerAction(email: string, password: string): Promise<CustomerAuthResult> {
  if (!isRequired(email) || !isRequired(password)) {
    return { success: false, error: GENERIC_LOGIN_ERROR }
  }

  const normalizedEmail = normalizeEmail(email)
  const rateLimitKey = customerRateLimitKey(normalizedEmail)

  // Checked before any database/bcrypt work — an attacker already over the
  // limit shouldn't cost a real password comparison per request.
  if (isLoginRateLimited(rateLimitKey)) {
    return { success: false, error: RATE_LIMIT_ERROR }
  }

  try {
    const user = await prisma.user.findFirst({ where: { email: normalizedEmail, role: 'customer' } })
    const passwordOk = await verifyPassword(password, user?.passwordHash)

    // Checked unconditionally (even when `user` is null, against an
    // undefined hash) so a nonexistent email and a wrong password take
    // observably similar time — never reveal which one failed.
    if (!user || !passwordOk) {
      recordFailedLoginAttempt(rateLimitKey)
      return { success: false, error: GENERIC_LOGIN_ERROR }
    }

    clearLoginAttempts(rateLimitKey)
    await setCustomerSessionCookie(user.id, user.passwordHash)
    return { success: true, user: toSafeCustomerUser(user) }
  } catch {
    return { success: false, error: GENERIC_LOGIN_ERROR }
  }
}

// ─── Logout ─────────────────────────────────────────────────────────────────

export async function logoutCustomerAction(): Promise<void> {
  const store = await cookies()
  store.delete(CUSTOMER_SESSION_COOKIE)
}

// ─── Session ────────────────────────────────────────────────────────────────

/** The only way any protected customer operation should learn "who is
 *  this". Throws when there's no valid session — callers let this
 *  propagate; there is nothing meaningful to do except reject the request.
 *
 *  Besides signature/shape/expiration (lib/auth/session.ts's own checks),
 *  this re-derives the token's embedded password fingerprint against the
 *  user's CURRENT passwordHash — a session issued before a password change
 *  carries the old fingerprint, which no longer matches, so it's rejected
 *  here exactly like any other invalid session. This is the actual
 *  revocation mechanism (see lib/auth/session.ts's module docstring); every
 *  other check in this function already existed before it. */
export async function requireCustomerSession(): Promise<SafeCustomerUser> {
  const store = await cookies()
  const session = verifyCustomerSessionToken(store.get(CUSTOMER_SESSION_COOKIE)?.value)
  if (!session) throw new Error('Unauthorized — please sign in.')

  const user = await prisma.user.findFirst({ where: { id: session.userId, role: 'customer' } })
  if (!user) throw new Error('Unauthorized — please sign in.')
  if (computePasswordFingerprint(user.passwordHash ?? '') !== session.passwordFingerprint) {
    throw new Error('Unauthorized — please sign in.')
  }

  return toSafeCustomerUser(user)
}

/** Non-throwing variant of requireCustomerSession() — for callers (like the
 *  client-side auth hydration in lib/auth-context.tsx) that want to know
 *  "is anyone signed in right now" without treating "no" as an error. */
export async function getCurrentCustomerAction(): Promise<SafeCustomerUser | null> {
  try {
    return await requireCustomerSession()
  } catch {
    return null
  }
}

// ─── Profile update ─────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  firstName: string
  lastName: string
  phone?: string
}

function validateProfileUpdate(input: UpdateProfileInput): string | null {
  if (!isRequired(input.firstName)) return 'First name is required.'
  if (!isRequired(input.lastName)) return 'Last name is required.'
  if (input.phone && input.phone.trim() && !isValidIndianPhone(input.phone)) return 'Please enter a valid phone number.'
  return null
}

/** userId always comes from the authenticated session, never from `input` —
 *  the update's `data` is deliberately limited to firstName/lastName/phone
 *  only, so this can never be used to change role, passwordHash, or email. */
export async function updateCustomerProfileAction(input: UpdateProfileInput): Promise<CustomerAuthResult> {
  const session = await requireCustomerSession()

  const validationError = validateProfileUpdate(input)
  if (validationError) return { success: false, error: validationError }

  try {
    const updated = await prisma.user.update({
      where: { id: session.id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
      },
    })
    return { success: true, user: toSafeCustomerUser(updated) }
  } catch {
    return { success: false, error: "Couldn't update your profile. Please try again." }
  }
}

// ─── Password change ────────────────────────────────────────────────────────

export interface ChangePasswordResult {
  success: boolean
  error?: string
}

const GENERIC_PASSWORD_CHANGE_ERROR = 'Current password is incorrect.'

/** Requires an authenticated session; verifies currentPassword against the
 *  stored hash before writing a new one. Never reveals anything beyond "the
 *  current password you gave was wrong" — there is no code path here that
 *  can be reached without already being signed in, so account-existence
 *  enumeration doesn't apply the way it does for login.
 *
 *  Changing passwordHash changes every session's password-fingerprint check
 *  (see lib/auth/session.ts's module docstring) — including this very
 *  request's own cookie, which was signed against the OLD hash. Re-issuing
 *  the cookie here, against the new hash, is what keeps the device that
 *  just changed the password signed in while every other previously issued
 *  session (a different browser/device) fails its next fingerprint check
 *  and has to sign in again — the intended revocation behavior, not an
 *  accidental self-logout. */
export async function changeCustomerPasswordAction(currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  const session = await requireCustomerSession()

  if (!isRequired(currentPassword) || !isRequired(newPassword)) {
    return { success: false, error: 'Please fill in both password fields.' }
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must contain at least 8 characters.' }
  }

  try {
    const user = await prisma.user.findFirst({ where: { id: session.id, role: 'customer' } })
    const currentOk = await verifyPassword(currentPassword, user?.passwordHash)
    if (!user || !currentOk) {
      return { success: false, error: GENERIC_PASSWORD_CHANGE_ERROR }
    }

    const passwordHash = await hashPassword(newPassword)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    await setCustomerSessionCookie(user.id, passwordHash)
    return { success: true }
  } catch {
    return { success: false, error: "Couldn't change your password. Please try again." }
  }
}
