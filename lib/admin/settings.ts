// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Settings Service
//
// The one place /admin/settings reads and writes store configuration
// through. Types + validation live in lib/admin/settings-form.ts
// (re-exported below so existing imports of this file keep working); real
// persistence lives in lib/admin/settings.actions.ts (Prisma, server-side):
//
//   Admin UI → this service → lib/admin/settings.actions.ts
//                              (Prisma 'use server' actions) → PostgreSQL
//
// Payment status is read, never edited — reflects the real PaymentMethod
// options checkout already offers (lib/types.ts), grouped by the gateway
// that would process them. No Razorpay/payment-credential columns exist on
// StoreSettings (see lib/admin/settings.db.ts's docstring), so this stays
// hardcoded to "Not Configured" for Razorpay — there is nothing in the
// database to read a real configured state from, and nothing to redact.
//
// SEED_* constants and the localStorage-backed getStoreSettings/
// getStorefrontSettings/getOrderSettings below are the pre-migration path —
// nothing writes to them any more (saveStoreSettings/etc. delegate to
// Prisma instead), kept only as an unused fallback.
// ─────────────────────────────────────────────────────────────────────────────

import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from '@/lib/cart-pricing'
import { LOW_STOCK_THRESHOLD } from '@/lib/product-detail-data'
import { ORDER_NUMBER_PREFIX } from '@/lib/order-storage'
import { updateOrderSettingsEntry, updateStoreSettingsEntry, updateStorefrontSettingsEntry } from './settings.actions'
import { SettingsValidationError, validateOrderSettings, validateStoreSettings, validateStorefrontSettings } from './settings-form'
import type {
  OrderSettings,
  PaymentStatusRow,
  StorefrontFormValues,
  StorefrontSettings,
  StoreSettings,
} from './settings-form'

export * from './settings-form'

// ─── Seed values (mock fallback) ───────────────────────────────────────────

const SEED_STORE: StoreSettings = {
  storeName: 'Nucouths',
  storeEmail: 'support@nucouths.com',
  storePhone: '+91 98200 12345',
  storeAddress: '4th Floor, Shreeji Arcade, C.G. Road, Ahmedabad, Gujarat 380009, India',
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
}

const SEED_STOREFRONT: StorefrontSettings = {
  storeStatus: 'Open',
  lowStockThreshold: LOW_STOCK_THRESHOLD,
  defaultShippingCharge: STANDARD_SHIPPING_FEE,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
}

const SEED_ORDER: OrderSettings = {
  orderPrefix: ORDER_NUMBER_PREFIX,
}

/** Server-safe initial render — used by prisma/seed.ts so the database seed
 *  corresponds to the same values this admin UI always started from. */
export function getSeedStoreSettings(): StoreSettings {
  return SEED_STORE
}
export function getSeedStorefrontSettings(): StorefrontSettings {
  return SEED_STOREFRONT
}
export function getSeedOrderSettings(): OrderSettings {
  return SEED_ORDER
}

/** Read-only — grouped by the gateway that would process each PaymentMethod
 *  checkout already offers (components/checkout/PaymentSection.tsx). Razorpay
 *  is the umbrella gateway for UPI/Card/Net Banking; none of the three has a
 *  real integration behind it yet (no SDK, no API key anywhere in this app,
 *  no credential column on StoreSettings), so it reads as Not Configured
 *  rather than pretending otherwise. Cash on Delivery needs no gateway, so
 *  it's always Available. */
export function getPaymentStatusRows(): PaymentStatusRow[] {
  return [
    {
      id: 'razorpay',
      label: 'Razorpay',
      methods: ['upi', 'card', 'netbanking'],
      description: 'Processes UPI, Card, and Net Banking payments at checkout.',
      configured: false,
      statusLabel: 'Not Configured',
    },
    {
      id: 'cod',
      label: 'Cash on Delivery',
      methods: ['cod'],
      description: 'Customer pays in cash on delivery — no gateway required.',
      configured: true,
      statusLabel: 'Available',
    },
  ]
}

// ─── Saves (real database, via Server Actions) ─────────────────────────────

export async function saveStoreSettings(values: StoreSettings): Promise<StoreSettings> {
  const errors = validateStoreSettings(values)
  if (Object.values(errors).some(Boolean)) throw new SettingsValidationError(errors)

  return updateStoreSettingsEntry(values)
}

export async function saveStorefrontSettings(values: StorefrontFormValues): Promise<StorefrontSettings> {
  const errors = validateStorefrontSettings(values)
  if (Object.values(errors).some(Boolean)) throw new SettingsValidationError(errors)

  return updateStorefrontSettingsEntry(values)
}

export async function saveOrderSettings(values: OrderSettings): Promise<OrderSettings> {
  const errors = validateOrderSettings(values)
  if (Object.values(errors).some(Boolean)) throw new SettingsValidationError(errors)

  return updateOrderSettingsEntry(values)
}

// ─── Mock/localStorage fallback (unused by the flow above) ────────────────

const KEYS = {
  store: 'nucouths-admin-settings-store',
  storefront: 'nucouths-admin-settings-storefront',
  order: 'nucouths-admin-settings-order',
} as const

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Client-only — the working (pre-migration, localStorage-backed) settings. */
export function getStoreSettings(): StoreSettings {
  return readJSON(KEYS.store, SEED_STORE)
}
export function getStorefrontSettings(): StorefrontSettings {
  return readJSON(KEYS.storefront, SEED_STOREFRONT)
}
export function getOrderSettings(): OrderSettings {
  return readJSON(KEYS.order, SEED_ORDER)
}
