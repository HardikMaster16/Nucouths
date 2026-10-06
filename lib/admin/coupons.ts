// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Coupon Service
//
// The one place /admin/coupons reads and writes coupon data through. Row
// shaping + form validation live in lib/admin/coupon-form.ts (re-exported
// below so existing imports of this file keep working); real persistence
// lives in lib/admin/coupons.actions.ts (Prisma, server-side):
//
//   Admin UI → this service → lib/admin/coupons.actions.ts
//                              (Prisma 'use server' actions) → PostgreSQL
//
// SEED_COUPONS / getSeedCoupons() stay exactly as they were — prisma/seed.ts
// reads them to seed the real Coupon table, so the database starts from the
// same data this mock catalog always used, not a second invented dataset.
// Everything else below the "mock/localStorage fallback" heading
// (getWorkingCoupons, getAllCouponRows, isCodeTaken's seed+localStorage
// check) is the pre-migration path — nothing writes to it any more
// (createCoupon/updateCoupon/deleteCoupon delegate to Prisma instead), kept
// only as an unused fallback and because validateCouponForm's instant,
// best-effort client-side code check still reads it for live-typing
// feedback in the form (see its own docstring).
// ─────────────────────────────────────────────────────────────────────────────

import {
  createCouponEntry,
  deleteCouponEntry,
  updateCouponEntry,
} from './coupons.actions'
import { CouponValidationError, hasCouponFormErrors, toAdminRow, validateCouponFormShape } from './coupon-form'
import type { Coupon } from '@/lib/cart-pricing'
import type { AdminCouponRow, CouponFormValues } from './coupon-form'

export * from './coupon-form'

const STORAGE_KEY = 'nucouths-admin-coupons'

const SEED_COUPONS: Coupon[] = [
  {
    id: 'coupon-welcome10',
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    maxDiscountAmount: 500,
    usageLimit: 500,
    usageCount: 128,
    startDate: '2026-06-01T00:00:00.000Z',
    enabled: true,
    currency: 'INR',
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
  },
  {
    id: 'coupon-flat500',
    code: 'FLAT500',
    type: 'fixed',
    value: 500,
    minOrderAmount: 2999,
    usageLimit: 100,
    usageCount: 41,
    startDate: '2026-08-01T00:00:00.000Z',
    expiryDate: '2026-10-31T23:59:59.000Z',
    enabled: true,
    currency: 'INR',
    createdAt: '2026-07-28T10:00:00.000Z',
    updatedAt: '2026-07-28T10:00:00.000Z',
  },
  {
    id: 'coupon-festive25',
    code: 'FESTIVE25',
    type: 'percentage',
    value: 25,
    minOrderAmount: 4999,
    maxDiscountAmount: 1500,
    usageLimit: 200,
    usageCount: 0,
    startDate: '2026-10-01T00:00:00.000Z',
    expiryDate: '2026-10-15T23:59:59.000Z',
    enabled: true,
    currency: 'INR',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'coupon-summer15',
    code: 'SUMMER15',
    type: 'percentage',
    value: 15,
    usageLimit: 300,
    usageCount: 300,
    startDate: '2026-04-01T00:00:00.000Z',
    expiryDate: '2026-06-30T23:59:59.000Z',
    enabled: true,
    currency: 'INR',
    createdAt: '2026-03-25T09:00:00.000Z',
    updatedAt: '2026-03-25T09:00:00.000Z',
  },
  {
    id: 'coupon-vip50',
    code: 'VIP50',
    type: 'fixed',
    value: 50,
    usageCount: 3,
    startDate: '2026-01-01T00:00:00.000Z',
    enabled: false,
    currency: 'INR',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
  },
]

/** The raw seed coupons — no admin-row formatting. Used by prisma/seed.ts so
 *  the database seed corresponds to the same mock data the admin UI started
 *  from, rather than a second invented dataset. */
export function getSeedCoupons(): Coupon[] {
  return SEED_COUPONS
}

// ─── Create / update / delete (real database, via Server Actions) ─────────

/** `excludeId` is the coupon currently being edited (if any), so its own
 *  code is never reported as a duplicate of itself. Instant, best-effort
 *  client-side check against the seed catalog + localStorage — see the
 *  module docstring. The authoritative check happens server-side, against
 *  the real database, inside lib/admin/coupons.actions.ts. */
export function validateCouponForm(values: CouponFormValues, excludeId?: string): ReturnType<typeof validateCouponFormShape> {
  const errors = validateCouponFormShape(values)
  const code = values.code.trim().toUpperCase()
  if (!errors.code && code && isCodeTaken(code, excludeId)) {
    errors.code = 'This code is already in use — choose another.'
  }
  return errors
}

export async function createCoupon(values: CouponFormValues): Promise<AdminCouponRow> {
  const errors = validateCouponForm(values)
  if (hasCouponFormErrors(errors)) throw new CouponValidationError(errors)

  return createCouponEntry(values)
}

export async function updateCoupon(id: string, values: CouponFormValues): Promise<AdminCouponRow> {
  const errors = validateCouponForm(values, id)
  if (hasCouponFormErrors(errors)) throw new CouponValidationError(errors)

  return updateCouponEntry(id, values)
}

export async function deleteCoupon(id: string): Promise<void> {
  await deleteCouponEntry(id)
}

// ─── Mock/localStorage fallback (unused by the flow above; see docstring) ──

function readStoredCoupons(): Coupon[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Coupon[]) : null
  } catch {
    return null
  }
}

function persistCoupons(coupons: Coupon[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons))
  } catch {
    // storage unavailable (private mode, quota) — edits still apply for the
    // rest of this page's lifetime via in-memory state
  }
}

/** Client-only. Seeds localStorage from SEED_COUPONS on first read, so ids
 *  and usage counts stay stable across reloads. */
function getWorkingCoupons(): Coupon[] {
  const stored = readStoredCoupons()
  if (stored) return stored
  persistCoupons(SEED_COUPONS)
  return SEED_COUPONS
}

/** Server-safe initial render — the same seed list getWorkingCoupons() falls
 *  back to, without touching localStorage. */
export function getSeedCouponRows(): AdminCouponRow[] {
  return SEED_COUPONS.map(toAdminRow)
}

/** Client-only — the working (possibly locally-edited, pre-migration) coupon
 *  list. */
export function getAllCouponRows(): AdminCouponRow[] {
  return getWorkingCoupons().map(toAdminRow)
}

function isCodeTaken(code: string, excludeId?: string): boolean {
  return getWorkingCoupons().some((c) => c.code === code && c.id !== excludeId)
}
