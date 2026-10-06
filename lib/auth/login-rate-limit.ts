// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Login Brute-Force Rate Limiting
//
// Shared by lib/auth/customer-auth.actions.ts's loginCustomerAction and
// lib/admin/auth/admin-session.actions.ts's adminLoginAction — the two
// password-guessing surfaces in this app. A plain in-memory sliding window,
// keyed by the caller-supplied identifier (see each action for what it
// passes), with no new dependency and no schema/migration:
//
//   - Deliberately NOT keyed by IP address. A client can set its own
//     X-Forwarded-For header, and this deployment has no configured trusted
//     reverse proxy to strip/overwrite it first — trusting it here would let
//     an attacker rotate a fake IP on every request and bypass the limit
//     entirely, which is worse than not having IP-based limiting at all.
//     Keying by the normalized email/identifier being attempted still
//     stops the actual attack this exists for (many password guesses
//     against one account), regardless of source IP.
//   - Deliberately in-memory, not persisted to Postgres or an external
//     store. This means the limit is per Node process: correct and
//     effective for a single long-running server process (this app's
//     deployment target — `next start`, no serverless/multi-instance
//     fan-out configured anywhere in this repo), but an attacker spread
//     across multiple independent instances behind a load balancer would
//     get a separate budget per instance. Making this correct under
//     horizontal scaling would need a shared store (Redis, or a new
//     Postgres table) — a new external service or a schema change this
//     task's instructions explicitly say not to introduce without genuine
//     need. If this app is ever deployed across multiple instances, this
//     is the one piece that would need revisiting.
//   - A bounded sweep (below MAX_TRACKED_KEYS) evicts expired entries
//     opportunistically so an attacker spraying many distinct fake
//     identifiers can't grow this map without bound.
// ─────────────────────────────────────────────────────────────────────────────

interface Bucket {
  count: number
  windowStart: number
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const MAX_TRACKED_KEYS = 5000

const buckets = new Map<string, Bucket>()

function isExpired(bucket: Bucket, now: number): boolean {
  return now - bucket.windowStart > WINDOW_MS
}

/** Best-effort eviction of expired entries, run only when the map has grown
 *  large enough to matter — keeps the common case (well under the
 *  threshold) free of any extra work. */
function sweepIfLarge(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return
  for (const [key, bucket] of buckets) {
    if (isExpired(bucket, now)) buckets.delete(key)
  }
}

/** True once `key` has reached MAX_ATTEMPTS failed logins within the
 *  current window. Callers should check this BEFORE doing any password
 *  verification, so an attacker who's already over the limit doesn't cost
 *  a bcrypt comparison per request. */
export function isLoginRateLimited(key: string): boolean {
  const bucket = buckets.get(key)
  if (!bucket) return false
  if (isExpired(bucket, Date.now())) {
    buckets.delete(key)
    return false
  }
  return bucket.count >= MAX_ATTEMPTS
}

/** Records one failed attempt for `key`, starting a fresh window if the
 *  previous one (if any) has expired. */
export function recordFailedLoginAttempt(key: string): void {
  const now = Date.now()
  sweepIfLarge(now)

  const bucket = buckets.get(key)
  if (!bucket || isExpired(bucket, now)) {
    buckets.set(key, { count: 1, windowStart: now })
    return
  }
  bucket.count += 1
}

/** Clears `key`'s bucket — called on a successful login so a legitimate
 *  user who mistyped their password a few times isn't left one attempt
 *  away from the limit the next time they actually need to sign in. */
export function clearLoginAttempts(key: string): void {
  buckets.delete(key)
}
