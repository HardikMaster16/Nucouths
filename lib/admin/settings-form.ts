// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Settings Form (types + validation)
//
// Pure, storage-agnostic logic shared by the mock/localStorage path
// (lib/admin/settings.ts) and the Prisma path (lib/admin/settings.actions.ts)
// — deliberately depends on neither, so importing this can never create a
// cycle between them (mirrors lib/admin/coupon-form.ts's role for Coupons).
// ─────────────────────────────────────────────────────────────────────────────

import type { PaymentMethod } from '@/lib/types'

// ─── Shapes ─────────────────────────────────────────────────────────────────

export interface StoreSettings {
  storeName: string
  storeEmail: string
  storePhone: string
  storeAddress: string
  currency: string
  timeZone: string
}

export type StoreStatus = 'Open' | 'Maintenance'

export interface StorefrontSettings {
  storeStatus: StoreStatus
  lowStockThreshold: number
  defaultShippingCharge: number
  freeShippingThreshold: number
}

export interface OrderSettings {
  orderPrefix: string
}

export interface PaymentStatusRow {
  id: 'razorpay' | 'cod'
  label: string
  methods: PaymentMethod[]
  description: string
  configured: boolean
  statusLabel: string
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface StoreSettingsErrors {
  storeName?: string
  storeEmail?: string
  storePhone?: string
  [key: string]: string | undefined
}

export function validateStoreSettings(values: StoreSettings): StoreSettingsErrors {
  const errors: StoreSettingsErrors = {}
  if (!values.storeName.trim()) errors.storeName = 'Store name is required.'

  const email = values.storeEmail.trim()
  if (!email) errors.storeEmail = 'Store email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.storeEmail = 'Enter a valid email address.'

  const phone = values.storePhone.trim()
  if (phone && !/^[+]?[\d\s()-]{7,}$/.test(phone)) errors.storePhone = 'Enter a valid phone number.'

  return errors
}

export interface StorefrontFormValues {
  storeStatus: StoreStatus
  lowStockThreshold: string
  defaultShippingCharge: string
  freeShippingThreshold: string
}

export interface StorefrontSettingsErrors {
  lowStockThreshold?: string
  defaultShippingCharge?: string
  freeShippingThreshold?: string
  [key: string]: string | undefined
}

function isNonNegativeNumber(value: string): boolean {
  if (!value.trim()) return false
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

export function validateStorefrontSettings(values: StorefrontFormValues): StorefrontSettingsErrors {
  const errors: StorefrontSettingsErrors = {}
  if (!isNonNegativeNumber(values.lowStockThreshold)) errors.lowStockThreshold = 'Enter a whole number, 0 or greater.'
  else if (!Number.isInteger(Number(values.lowStockThreshold))) errors.lowStockThreshold = 'Enter a whole number, 0 or greater.'

  if (!isNonNegativeNumber(values.defaultShippingCharge)) errors.defaultShippingCharge = 'Enter an amount, 0 or greater.'
  if (!isNonNegativeNumber(values.freeShippingThreshold)) errors.freeShippingThreshold = 'Enter an amount, 0 or greater.'

  return errors
}

export interface OrderSettingsErrors {
  orderPrefix?: string
  [key: string]: string | undefined
}

export function validateOrderSettings(values: OrderSettings): OrderSettingsErrors {
  const errors: OrderSettingsErrors = {}
  const prefix = values.orderPrefix.trim().toUpperCase()
  if (!prefix) errors.orderPrefix = 'Order prefix is required.'
  else if (!/^[A-Z0-9]+$/.test(prefix)) errors.orderPrefix = 'Use letters and numbers only.'
  return errors
}

export class SettingsValidationError extends Error {
  errors: Record<string, string | undefined>
  constructor(errors: Record<string, string | undefined>) {
    super('Settings validation failed')
    this.name = 'SettingsValidationError'
    this.errors = errors
  }
}
