// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Coupon Reads (Prisma)
//
// Server-only reads backing /admin/coupons. Imported only from that Server
// Component and from lib/admin/coupons.actions.ts's Server Actions — never
// from a 'use client' component, so Prisma is never pulled into a browser
// bundle.
//
// Maps a Prisma Coupon row onto the exact lib/cart-pricing.ts Coupon shape
// (the same type the mock catalog already used), then reuses
// lib/admin/coupon-form.ts's toAdminRow for the row formatting — so a
// database-backed row and a mock-backed row are built by the identical
// function, never two competing implementations.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { toAdminRow } from './coupon-form'
import { requireAdminSession } from './auth/admin-session.actions'
import type { AdminCouponRow } from './coupon-form'
import type { Coupon } from '@/lib/cart-pricing'

function decimalToNumber(value: Prisma.Decimal | null): number | undefined {
  return value === null ? undefined : Number(value)
}

export function dbCouponToCoupon(c: Prisma.CouponGetPayload<object>): Coupon {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: Number(c.value),
    minOrderAmount: decimalToNumber(c.minOrderAmount),
    maxDiscountAmount: decimalToNumber(c.maxDiscountAmount),
    usageLimit: c.usageLimit ?? undefined,
    usageCount: c.usageCount,
    startDate: c.startDate.toISOString(),
    expiryDate: c.expiryDate ? c.expiryDate.toISOString() : undefined,
    enabled: c.enabled,
    currency: c.currency,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function dbCouponToAdminRow(c: Prisma.CouponGetPayload<object>): AdminCouponRow {
  return toAdminRow(dbCouponToCoupon(c))
}

/** All coupons, newest first, shaped for the admin listing. Requires an
 *  admin session — app/admin/(dashboard)/coupons/page.tsx has no guard of
 *  its own (the client-side AdminShell redirect doesn't stop a Server
 *  Component's data fetch from running or reaching the RSC payload — see
 *  Next.js's own authentication guide), so the check happens here, right
 *  at the data source. */
export async function listAdminCoupons(): Promise<AdminCouponRow[]> {
  await requireAdminSession()
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(dbCouponToAdminRow)
}
