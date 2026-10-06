// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Server-Verifiable Customer Session Token
//
// Deliberately separate from lib/admin/auth/session.ts in every respect —
// different cookie name, different signing secret (a different env var), so
// an admin session token can never be replayed as a customer session (or
// vice versa) even if one secret were somehow compromised. A signed,
// httpOnly cookie carrying a userId and a password fingerprint, issued by
// lib/auth/customer-auth.actions.ts on login/register.
//
// The token itself is a JSON payload (userId + password fingerprint +
// issued-at) base64url-encoded, HMAC-SHA256 signed with a server-only
// secret, and compared with a constant-time check — the same construction
// lib/admin/auth/session.ts uses, just keyed and named independently.
//
// Two things make a token that verified correctly (signature + shape) still
// rejected:
//   - Expiration: `iat` is checked against CUSTOMER_SESSION_MAX_AGE_SECONDS
//     on every verify, not just left to the cookie's own browser-enforced
//     maxAge — a captured/replayed token can't be used past its real
//     lifetime just because something bypassed normal cookie expiry.
//   - Password fingerprint: a non-reversible fingerprint of the user's
//     current passwordHash (see computePasswordFingerprint below), embedded
//     at login/register and re-checked by
//     lib/auth/customer-auth.actions.ts's requireCustomerSession() against
//     the user's CURRENT passwordHash on every call. Changing the password
//     changes passwordHash, which changes the fingerprint, which makes
//     every previously issued token fail that comparison — the smallest
//     possible revocation mechanism this stateless-token architecture
//     supports, with no session table and no schema change (passwordHash
//     already exists and is already read by every session check).
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto'

// No hardcoded fallback secret — a fixed, known "dev" value is exactly what
// this needs to never be, since anyone who reads this file would then be
// able to forge a valid customer session against any deployment that
// forgot to set CUSTOMER_SESSION_SECRET. Instead:
//   - production (NODE_ENV==='production') with no secret set: hard fail
//     the first time a session is actually signed/verified (never at
//     module import — see resolveSecret's own note — so `next build`
//     itself is unaffected even when secrets aren't provisioned yet).
//   - development with no secret set: a random secret generated once for
//     this process (never a fixed/known value) — existing sessions just
//     reset on restart, which is acceptable dev friction and gives an
//     attacker nothing fixed to target.
let cachedDevSecret: string | null = null

function resolveSecret(): string {
  const configured = process.env.CUSTOMER_SESSION_SECRET
  if (configured) return configured

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CUSTOMER_SESSION_SECRET is not set. Refusing to sign or verify customer sessions in production without it.'
    )
  }

  if (!cachedDevSecret) {
    cachedDevSecret = crypto.randomBytes(32).toString('hex')
    console.warn(
      '[customer session] CUSTOMER_SESSION_SECRET is not set — using a random, process-local development secret ' +
        '(sessions will reset on restart). Set CUSTOMER_SESSION_SECRET before deploying.'
    )
  }
  return cachedDevSecret
}

export const CUSTOMER_SESSION_COOKIE = 'nucouths_customer_session'

/** 30 days — a normal "stay signed in" customer session length, longer than
 *  the admin session's 8 hours since this isn't a privileged back-office
 *  tool. */
export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function sign(payload: string): string {
  return crypto.createHmac('sha256', resolveSecret()).update(payload).digest('base64url')
}

/** A short, non-reversible fingerprint of a user's current passwordHash —
 *  never the hash itself (this ends up inside a client-readable, if
 *  unforgeable, cookie payload; a bcrypt hash has no business ever being
 *  exposed there, even encoded rather than encrypted). SHA-256 over an
 *  already-one-way bcrypt hash reveals nothing about the plaintext
 *  password, and truncating to 16 base64url chars (96 bits) is still far
 *  more than enough to make an unrelated collision practically impossible
 *  while keeping the token small. */
export function computePasswordFingerprint(passwordHash: string): string {
  return crypto.createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16)
}

export function createCustomerSessionToken(userId: string, passwordFingerprint: string): string {
  const payload = JSON.stringify({ userId, pfp: passwordFingerprint, iat: Date.now() })
  const encoded = Buffer.from(payload, 'utf8').toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

/** Verifies the signature (constant-time compare), shape, and expiration,
 *  returning the carried userId + password fingerprint only when all hold.
 *  Never throws — a malformed, tampered, or expired token is just treated
 *  as "no session". The password-fingerprint comparison against the user's
 *  CURRENT passwordHash happens in the caller (requireCustomerSession()),
 *  which is the one that actually has a fresh database read to compare
 *  against. */
export function verifyCustomerSessionToken(token: string | undefined | null): { userId: string; passwordFingerprint: string } | null {
  if (!token) return null

  const dotIndex = token.indexOf('.')
  if (dotIndex < 0) return null
  const encoded = token.slice(0, dotIndex)
  const signature = token.slice(dotIndex + 1)
  if (!encoded || !signature) return null

  const expected = Buffer.from(sign(encoded))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      userId?: unknown
      pfp?: unknown
      iat?: unknown
    }
    if (typeof payload.userId !== 'string' || typeof payload.pfp !== 'string' || typeof payload.iat !== 'number') {
      return null
    }
    if (Date.now() - payload.iat > CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000) return null

    return { userId: payload.userId, passwordFingerprint: payload.pfp }
  } catch {
    return null
  }
}
