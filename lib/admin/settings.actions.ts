'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Settings Mutations (Prisma)
//
// The real persistence behind lib/admin/settings.ts's
// saveStoreSettings/saveStorefrontSettings/saveOrderSettings. Every export
// here is a Server Action reachable directly as a POST endpoint, so each one:
//
//   1. Calls requireAdminSession() first, unconditionally — the same guard
//      every other admin module's mutations use.
//   2. Re-validates the form (never trusts that the client's own
//      validateStoreSettings/etc. actually ran) — unchanged rules from
//      lib/admin/settings-form.ts.
//   3. Upserts the one singleton row (id: "singleton", a fixed literal —
//      see lib/admin/settings.db.ts), touching only the fields this
//      section owns. Each of the three admin form sections
//      (StoreSettingsSection/StorefrontSettingsSection/OrderSettingsSection)
//      saves independently, so a Storefront save must never overwrite the
//      Store or Order fields sitting alongside them on the same row — an
//      `update` with only that section's keys does exactly that; upsert
//      instead of update guards against the (should-never-happen) case
//      where the row doesn't exist yet, without ever risking a second row,
//      since the id is fixed rather than generated.
//
// No API keys/secrets/Razorpay credentials exist on this model — there is
// nothing here that could leak one.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './auth/admin-session.actions'
import {
  SettingsValidationError,
  validateOrderSettings,
  validateStoreSettings,
  validateStorefrontSettings,
} from './settings-form'
import type { OrderSettings, StorefrontFormValues, StorefrontSettings, StoreSettings } from './settings-form'

type Tx = Prisma.TransactionClient

const SINGLETON_ID = 'singleton'

/** Fallback defaults for the fields a given save does NOT own, used only if
 *  upsert has to `create` the row from scratch (the row should already
 *  exist — prisma/seed.ts creates it — so this path is a defensive
 *  self-heal, not the normal one). */
const CREATE_DEFAULTS = {
  storeName: 'Nucouths',
  storeEmail: 'support@nucouths.com',
  storePhone: '+91 98200 12345',
  storeAddress: '4th Floor, Shreeji Arcade, C.G. Road, Ahmedabad, Gujarat 380009, India',
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
  storeStatus: 'Open' as const,
  lowStockThreshold: 3,
  defaultShippingCharge: new Prisma.Decimal(0),
  freeShippingThreshold: new Prisma.Decimal(0),
  orderPrefix: 'NCT',
}

export async function updateStoreSettingsEntry(values: StoreSettings): Promise<StoreSettings> {
  await requireAdminSession()

  const errors = validateStoreSettings(values)
  if (Object.values(errors).some(Boolean)) throw new SettingsValidationError(errors)

  const patch = {
    storeName: values.storeName.trim(),
    storeEmail: values.storeEmail.trim(),
    storePhone: values.storePhone.trim() || null,
    storeAddress: values.storeAddress.trim() || null,
    currency: values.currency,
    timeZone: values.timeZone,
  }

  const row = await prisma.$transaction(async (tx: Tx) =>
    tx.storeSettings.upsert({
      where: { id: SINGLETON_ID },
      update: patch,
      create: { id: SINGLETON_ID, ...CREATE_DEFAULTS, ...patch },
    })
  )

  return {
    storeName: row.storeName,
    storeEmail: row.storeEmail,
    storePhone: row.storePhone ?? '',
    storeAddress: row.storeAddress ?? '',
    currency: row.currency,
    timeZone: row.timeZone,
  }
}

export async function updateStorefrontSettingsEntry(values: StorefrontFormValues): Promise<StorefrontSettings> {
  await requireAdminSession()

  const errors = validateStorefrontSettings(values)
  if (Object.values(errors).some(Boolean)) throw new SettingsValidationError(errors)

  const patch = {
    storeStatus: values.storeStatus,
    lowStockThreshold: Math.round(Number(values.lowStockThreshold)),
    defaultShippingCharge: new Prisma.Decimal(values.defaultShippingCharge),
    freeShippingThreshold: new Prisma.Decimal(values.freeShippingThreshold),
  }

  const row = await prisma.$transaction(async (tx: Tx) =>
    tx.storeSettings.upsert({
      where: { id: SINGLETON_ID },
      update: patch,
      create: { id: SINGLETON_ID, ...CREATE_DEFAULTS, ...patch },
    })
  )

  return {
    storeStatus: row.storeStatus,
    lowStockThreshold: row.lowStockThreshold,
    defaultShippingCharge: Number(row.defaultShippingCharge),
    freeShippingThreshold: Number(row.freeShippingThreshold),
  }
}

export async function updateOrderSettingsEntry(values: OrderSettings): Promise<OrderSettings> {
  await requireAdminSession()

  const errors = validateOrderSettings(values)
  if (Object.values(errors).some(Boolean)) throw new SettingsValidationError(errors)

  const patch = { orderPrefix: values.orderPrefix.trim().toUpperCase() }

  const row = await prisma.$transaction(async (tx: Tx) =>
    tx.storeSettings.upsert({
      where: { id: SINGLETON_ID },
      update: patch,
      create: { id: SINGLETON_ID, ...CREATE_DEFAULTS, ...patch },
    })
  )

  return { orderPrefix: row.orderPrefix }
}
