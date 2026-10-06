// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Coupon Form (row shaping + draft validation)
//
// Pure, storage-agnostic logic shared by the mock/localStorage path
// (lib/admin/coupons.ts) and the Prisma path (lib/admin/coupons.actions.ts)
// — deliberately depends on neither, so importing this can never create a
// cycle between them (mirrors lib/admin/product-form.ts's role for Products
// and lib/admin/taxonomy-form.ts's for Categories/Collections).
// ─────────────────────────────────────────────────────────────────────────────

import { formatPrice } from '@/lib/cart-pricing'
import { formatUpdatedAt } from './products'
import type { Coupon, CouponType } from '@/lib/cart-pricing'

// ─── Row shaping ────────────────────────────────────────────────────────────

export type CouponStatus = 'Active' | 'Scheduled' | 'Expired' | 'Disabled'

export interface AdminCouponRow extends Coupon {
  status: CouponStatus
  typeLabel: string
  discountValueFormatted: string
  usageLabel: string
  startDateFormatted: string
  expiryDateFormatted: string | undefined
}

const TYPE_LABELS: Record<CouponType, string> = { percentage: 'Percentage', fixed: 'Fixed Amount' }

/** Enabled/disabled is a manual override that always wins; otherwise the
 *  status follows the coupon's own start/expiry dates — the only three
 *  signals this model has, so these are the only statuses the filter/table
 *  ever need to represent. */
export function computeCouponStatus(coupon: Pick<Coupon, 'enabled' | 'startDate' | 'expiryDate'>, now: number): CouponStatus {
  if (!coupon.enabled) return 'Disabled'
  if (new Date(coupon.startDate).getTime() > now) return 'Scheduled'
  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now) return 'Expired'
  return 'Active'
}

export function toAdminRow(coupon: Coupon): AdminCouponRow {
  return {
    ...coupon,
    status: computeCouponStatus(coupon, Date.now()),
    typeLabel: TYPE_LABELS[coupon.type],
    discountValueFormatted: coupon.type === 'percentage' ? `${coupon.value}%` : formatPrice(coupon.value, coupon.currency),
    usageLabel: coupon.usageLimit ? `${coupon.usageCount} / ${coupon.usageLimit} used` : `${coupon.usageCount} used`,
    startDateFormatted: formatUpdatedAt(coupon.startDate),
    expiryDateFormatted: coupon.expiryDate ? formatUpdatedAt(coupon.expiryDate) : undefined,
  }
}

// ─── Form values ────────────────────────────────────────────────────────────

export interface CouponFormValues {
  code: string
  type: CouponType
  value: string
  minOrderAmount: string
  maxDiscountAmount: string
  usageLimit: string
  /** yyyy-mm-dd, matching <input type="date">. */
  startDate: string
  expiryDate: string
  enabled: boolean
}

export function createInitialCouponForm(): CouponFormValues {
  return {
    code: '',
    type: 'percentage',
    value: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    enabled: true,
  }
}

export function couponToFormValues(coupon: Coupon): CouponFormValues {
  return {
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value),
    minOrderAmount: coupon.minOrderAmount !== undefined ? String(coupon.minOrderAmount) : '',
    maxDiscountAmount: coupon.maxDiscountAmount !== undefined ? String(coupon.maxDiscountAmount) : '',
    usageLimit: coupon.usageLimit !== undefined ? String(coupon.usageLimit) : '',
    startDate: coupon.startDate.slice(0, 10),
    expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 10) : '',
    enabled: coupon.enabled,
  }
}

export interface CouponFormErrors {
  code?: string
  value?: string
  minOrderAmount?: string
  maxDiscountAmount?: string
  usageLimit?: string
  startDate?: string
  expiryDate?: string
}

export function hasCouponFormErrors(errors: CouponFormErrors): boolean {
  return Object.values(errors).some(Boolean)
}

/** Format/range-only checks — required fields, numeric ranges (including the
 *  percentage-must-be-1-to-100 rule), date ordering. No uniqueness check —
 *  see lib/admin/coupons.ts's validateCouponForm for the mock+localStorage
 *  instant client-side check, and lib/admin/coupons.actions.ts for the
 *  authoritative one against the real database. Identical rules to the
 *  original mock validateCouponForm, just with the uniqueness check split
 *  out — no business rule here was changed. */
export function validateCouponFormShape(values: CouponFormValues): CouponFormErrors {
  const errors: CouponFormErrors = {}

  const code = values.code.trim().toUpperCase()
  if (!code) errors.code = 'Coupon code is required.'
  else if (!/^[A-Z0-9]+$/.test(code)) errors.code = 'Use letters and numbers only.'

  const value = Number(values.value)
  if (!values.value.trim()) errors.value = 'Discount value is required.'
  else if (!Number.isFinite(value) || value <= 0) errors.value = 'Enter a value greater than 0.'
  else if (values.type === 'percentage' && (value < 1 || value > 100)) errors.value = 'Percentage must be between 1 and 100.'

  if (values.minOrderAmount.trim()) {
    const n = Number(values.minOrderAmount)
    if (!Number.isFinite(n) || n < 0) errors.minOrderAmount = 'Enter a valid amount.'
  }

  if (values.type === 'percentage' && values.maxDiscountAmount.trim()) {
    const n = Number(values.maxDiscountAmount)
    if (!Number.isFinite(n) || n <= 0) errors.maxDiscountAmount = 'Enter a valid amount.'
  }

  if (values.usageLimit.trim()) {
    const n = Number(values.usageLimit)
    if (!Number.isInteger(n) || n <= 0) errors.usageLimit = 'Enter a whole number greater than 0.'
  }

  if (!values.startDate) errors.startDate = 'Start date is required.'

  if (values.expiryDate && values.startDate && values.expiryDate < values.startDate) {
    errors.expiryDate = 'Expiry date cannot be before the start date.'
  }

  return errors
}

export class CouponValidationError extends Error {
  errors: CouponFormErrors
  constructor(errors: CouponFormErrors) {
    super('Coupon form validation failed')
    this.name = 'CouponValidationError'
    this.errors = errors
  }
}

export function toISODateStart(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString()
}
export function toISODateEnd(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.000Z`).toISOString()
}
