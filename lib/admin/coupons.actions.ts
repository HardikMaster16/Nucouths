'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Coupon Mutations (Prisma)
//
// The real persistence behind lib/admin/coupons.ts's
// createCoupon/updateCoupon/deleteCoupon. Every export here is a Server
// Action reachable directly as a POST endpoint, so each one:
//
//   1. Calls requireAdminSession() first, unconditionally — the same guard
//      every other admin module's mutations use.
//   2. Re-validates the form shape (never trusts that the client's own
//      validateCouponForm actually ran) — including the percentage-must-
//      be-1-to-100 rule and the rest of lib/admin/coupon-form.ts's
//      validateCouponFormShape, unchanged from the original mock rules.
//   3. Re-checks code uniqueness against the real database inside a
//      transaction, with Coupon.code's own unique constraint as the final
//      backstop (the P2002 handling below) — coupons.ts's isCodeTaken is
//      only a best-effort, instant client-side check against the seed
//      catalog + localStorage, not the database.
//
// Deleting a coupon that's already been used on real orders is allowed
// (matches the existing UI, which only warns via DeleteCouponDialog's
// usageCount message, never blocks) — Order.couponId is ON DELETE SET NULL
// (prisma/migrations/20260921112841_init), so this can never leave a
// dangling reference; it just detaches those orders' coupon reference while
// their own totals (already computed at checkout time) are untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './auth/admin-session.actions'
import { CouponValidationError, hasCouponFormErrors, toISODateEnd, toISODateStart, validateCouponFormShape } from './coupon-form'
import { dbCouponToAdminRow } from './coupons.db'
import type { AdminCouponRow, CouponFormValues } from './coupon-form'

type Tx = Prisma.TransactionClient

function assertValidShape(values: CouponFormValues): void {
  const errors = validateCouponFormShape(values)
  if (hasCouponFormErrors(errors)) throw new CouponValidationError(errors)
}

function parseCouponData(values: CouponFormValues) {
  return {
    code: values.code.trim().toUpperCase(),
    type: values.type,
    value: new Prisma.Decimal(values.value),
    minOrderAmount: values.minOrderAmount.trim() ? new Prisma.Decimal(values.minOrderAmount) : null,
    maxDiscountAmount:
      values.type === 'percentage' && values.maxDiscountAmount.trim() ? new Prisma.Decimal(values.maxDiscountAmount) : null,
    usageLimit: values.usageLimit.trim() ? Number(values.usageLimit) : null,
    startDate: new Date(toISODateStart(values.startDate)),
    expiryDate: values.expiryDate ? new Date(toISODateEnd(values.expiryDate)) : null,
    enabled: values.enabled,
  }
}

function rethrowAsUserFacingError(err: unknown, fallbackMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new CouponValidationError({ code: 'This code is already in use — choose another.' })
  }
  if (err instanceof Error) throw err
  throw new Error(fallbackMessage)
}

export async function createCouponEntry(values: CouponFormValues): Promise<AdminCouponRow> {
  await requireAdminSession()
  assertValidShape(values)

  const data = parseCouponData(values)

  try {
    const created = await prisma.$transaction(async (tx: Tx) => {
      const conflict = await tx.coupon.findUnique({ where: { code: data.code } })
      if (conflict) throw new CouponValidationError({ code: 'This code is already in use — choose another.' })

      return tx.coupon.create({ data: { ...data, usageCount: 0, currency: 'INR' } })
    })
    return dbCouponToAdminRow(created)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not create coupon.')
  }
}

export async function updateCouponEntry(id: string, values: CouponFormValues): Promise<AdminCouponRow> {
  await requireAdminSession()
  assertValidShape(values)

  const data = parseCouponData(values)

  try {
    const updated = await prisma.$transaction(async (tx: Tx) => {
      // Never trust that `id` (client-supplied) refers to a real row —
      // re-read it from the database inside the transaction.
      const existing = await tx.coupon.findUnique({ where: { id } })
      if (!existing) throw new Error('Coupon not found.')

      const conflict = await tx.coupon.findFirst({ where: { code: data.code, NOT: { id } } })
      if (conflict) throw new CouponValidationError({ code: 'This code is already in use — choose another.' })

      // usageCount and currency are deliberately omitted — an edit never
      // resets real redemption history or changes the currency a coupon
      // was created in, matching the mock version's `{...existing, ...}`
      // spread exactly.
      return tx.coupon.update({ where: { id }, data })
    })
    return dbCouponToAdminRow(updated)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not update coupon.')
  }
}

export async function deleteCouponEntry(id: string): Promise<{ ok: true }> {
  await requireAdminSession()

  try {
    await prisma.coupon.delete({ where: { id } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Coupon not found.')
    }
    throw err instanceof Error ? err : new Error('Could not delete coupon.')
  }
  return { ok: true }
}
