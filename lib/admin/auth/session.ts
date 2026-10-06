// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Server-Verifiable Admin Session Token
//
// Server Actions are public POST endpoints reachable directly, so every
// admin mutation (lib/admin/*.actions.ts, lib/banners.actions.ts) needs
// something the *server* can verify without trusting anything the browser
// sends. This is that: a signed, httpOnly cookie carrying an adminId and a
// password fingerprint, issued by lib/admin/auth/admin-session.actions.ts
// on login — the token is HMAC-signed with a server-only secret, so it
// cannot be forged or edited by the client.
//
// Same two additional rejections as lib/auth/session.ts's identical
// construction (see that file's docstring for the full reasoning):
// server-side `iat` expiration on every verify (not just the cookie's own
// browser-enforced maxAge), and a passwordHash fingerprint re-checked
// against the admin's current hash on every requireAdminSession() call —
// the smallest possible session-revocation mechanism, with no session
// table and no schema change.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto'

// No hardcoded fallback secret — see lib/auth/session.ts's identical
// resolveSecret() for the full reasoning (fail closed in production,
// random process-local secret in development, never a fixed known value).
let cachedDevSecret: string | null = null

function resolveSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET
  if (configured) {
    // Defense in depth for the "use separate secrets" requirement itself —
    // an admin token signed with the same secret as a customer token would
    // still fail lib/auth/session.ts's verify (different payload shape:
    // `adminId` vs `userId`), but that's not a guarantee worth resting an
    // entire cross-role isolation story on. Fail closed in production if
    // an operator ever sets both env vars to the same value.
    if (process.env.NODE_ENV === 'production' && configured === process.env.CUSTOMER_SESSION_SECRET) {
      throw new Error(
        'ADMIN_SESSION_SECRET must not equal CUSTOMER_SESSION_SECRET. Refusing to sign or verify admin sessions with a shared secret.'
      )
    }
    return configured
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_SESSION_SECRET is not set. Refusing to sign or verify admin sessions in production without it.'
    )
  }

  if (!cachedDevSecret) {
    cachedDevSecret = crypto.randomBytes(32).toString('hex')
    console.warn(
      '[admin session] ADMIN_SESSION_SECRET is not set — using a random, process-local development secret ' +
        '(sessions will reset on restart). Set ADMIN_SESSION_SECRET before deploying.'
    )
  }
  return cachedDevSecret
}

export const ADMIN_SESSION_COOKIE = 'nucouths_admin_session'

/** 8 hours — long enough for a normal admin working session, short enough
 *  that a leaked/forgotten cookie doesn't stay valid indefinitely. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

function sign(payload: string): string {
  return crypto.createHmac('sha256', resolveSecret()).update(payload).digest('base64url')
}

/** Same construction as lib/auth/session.ts's computePasswordFingerprint —
 *  see that file's docstring for why this is a fingerprint, never the raw
 *  hash. Deliberately not shared code: the two session systems stay
 *  independent in every respect, including which module their crypto
 *  helpers live in. */
export function computePasswordFingerprint(passwordHash: string): string {
  return crypto.createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16)
}

export function createAdminSessionToken(adminId: string, passwordFingerprint: string): string {
  const payload = JSON.stringify({ adminId, pfp: passwordFingerprint, iat: Date.now() })
  const encoded = Buffer.from(payload, 'utf8').toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

/** Verifies the signature (constant-time compare), shape, and expiration,
 *  returning the carried adminId + password fingerprint only when all
 *  hold. Never throws — a malformed, tampered, or expired token is just
 *  treated as "no session". The password-fingerprint comparison against
 *  the admin's CURRENT passwordHash happens in the caller
 *  (requireAdminSession()), which is the one that actually has a fresh
 *  database read to compare against. */
export function verifyAdminSessionToken(token: string | undefined | null): { adminId: string; passwordFingerprint: string } | null {
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
      adminId?: unknown
      pfp?: unknown
      iat?: unknown
    }
    if (typeof payload.adminId !== 'string' || typeof payload.pfp !== 'string' || typeof payload.iat !== 'number') {
      return null
    }
    if (Date.now() - payload.iat > ADMIN_SESSION_MAX_AGE_SECONDS * 1000) return null

    return { adminId: payload.adminId, passwordFingerprint: payload.pfp }
  } catch {
    return null
  }
}
