// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Settings Reads (Prisma)
//
// Server-only reads backing /admin/settings. Imported only from that Server
// Component and from lib/admin/settings.actions.ts's Server Actions — never
// from a 'use client' component, so Prisma is never pulled into a browser
// bundle.
//
// StoreSettings is a genuine singleton (prisma/schema.prisma: `id String
// @id @default("singleton")` — a fixed literal, not a generated id), and
// prisma/seed.ts already upserts exactly one row keyed by that id. Reading
// it uses upsert too (a no-op "update" when the row already exists, which
// it always should) rather than a plain findUnique, purely as a defensive
// self-heal if that row were ever somehow missing — upsert against a fixed
// id can never create a second row, so the singleton invariant holds either
// way.
//
// No Razorpay/payment-credential columns exist on this model at all (see
// the schema's own comment: "Never stores API keys/secrets... payment
// configuration is status-only, by design") — getPaymentStatusRows() in
// lib/admin/settings.ts stays exactly as it was, hardcoded to "Not
// Configured" for Razorpay, since there is nothing in the database to read
// a real configured state from.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from '@/lib/cart-pricing'
import { LOW_STOCK_THRESHOLD } from '@/lib/product-detail-data'
import { ORDER_NUMBER_PREFIX } from '@/lib/order-storage'
import { requireAdminSession } from './auth/admin-session.actions'
import type { OrderSettings, StoreSettings, StorefrontSettings } from './settings-form'
import type { Prisma } from '@prisma/client'

const SINGLETON_ID = 'singleton'

/** Same defaults lib/admin/settings.ts's SEED_* constants use — only
 *  reached if the singleton row were ever missing (it shouldn't be;
 *  prisma/seed.ts already creates it). */
const DEFAULT_ROW = {
  id: SINGLETON_ID,
  storeName: 'Nucouths',
  storeEmail: 'support@nucouths.com',
  storePhone: '+91 98200 12345',
  storeAddress: '4th Floor, Shreeji Arcade, C.G. Road, Ahmedabad, Gujarat 380009, India',
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
  storeStatus: 'Open' as const,
  lowStockThreshold: LOW_STOCK_THRESHOLD,
  defaultShippingCharge: STANDARD_SHIPPING_FEE,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  orderPrefix: ORDER_NUMBER_PREFIX,
}

async function getOrCreateSettingsRow(): Promise<Prisma.StoreSettingsGetPayload<object>> {
  return prisma.storeSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: DEFAULT_ROW,
  })
}

function rowToStore(row: Prisma.StoreSettingsGetPayload<object>): StoreSettings {
  return {
    storeName: row.storeName,
    storeEmail: row.storeEmail,
    storePhone: row.storePhone ?? '',
    storeAddress: row.storeAddress ?? '',
    currency: row.currency,
    timeZone: row.timeZone,
  }
}

function rowToStorefront(row: Prisma.StoreSettingsGetPayload<object>): StorefrontSettings {
  return {
    storeStatus: row.storeStatus,
    lowStockThreshold: row.lowStockThreshold,
    defaultShippingCharge: Number(row.defaultShippingCharge),
    freeShippingThreshold: Number(row.freeShippingThreshold),
  }
}

function rowToOrder(row: Prisma.StoreSettingsGetPayload<object>): OrderSettings {
  return { orderPrefix: row.orderPrefix }
}

/** All three settings sections, read from the one singleton row in a single
 *  query — there is only ever one row to read, so there's no reason for
 *  /admin/settings's three form sections to each trigger their own
 *  round trip. Requires an admin session — app/admin/(dashboard)/settings/
 *  page.tsx has no guard of its own (the client-side AdminShell redirect
 *  doesn't stop a Server Component's data fetch from running or reaching
 *  the RSC payload — see Next.js's own authentication guide), so the check
 *  happens here, right at the data source. */
export async function getAdminSettingsRecord(): Promise<{
  store: StoreSettings
  storefront: StorefrontSettings
  order: OrderSettings
}> {
  await requireAdminSession()
  const row = await getOrCreateSettingsRow()
  return { store: rowToStore(row), storefront: rowToStorefront(row), order: rowToOrder(row) }
}
