'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Banner Mutations (Prisma)
//
// The real persistence behind lib/banners.ts's
// createBanner/updateBanner/deleteBanner. Every export here is a Server
// Action reachable directly as a POST endpoint, so each one:
//
//   1. Calls requireAdminSession() first, unconditionally — the same guard
//      every other admin module's mutations use.
//   2. Re-validates the form (never trusts that the client's own
//      validateBannerForm actually ran) — unchanged rules from
//      lib/banner-form.ts, including "end date can't be before start date".
//   3. Writes with a single, freshly-recomputed set of fields from the
//      submitted values (not a partial patch over the existing row) — same
//      "rebuild fully on every save" behavior the original mock
//      fromFormValues already had, so editing a banner can't leave a stale
//      field behind from a previous save.
//
// No uniqueness constraint exists on any Banner field, so unlike Products/
// Categories/Coupons there's no code/slug conflict to guard against here.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './admin/auth/admin-session.actions'
import { BannerValidationError, hasBannerFormErrors, toISODateEnd, toISODateStart, validateBannerForm } from './banner-form'
import { dbBannerToBanner } from './banners.db'
import type { Banner, BannerFormValues } from './banner-form'

type Tx = Prisma.TransactionClient

function assertValid(values: BannerFormValues): void {
  const errors = validateBannerForm(values)
  if (hasBannerFormErrors(errors)) throw new BannerValidationError(errors)
}

function parseBannerData(values: BannerFormValues) {
  return {
    title: values.title.trim(),
    subtitle: values.subtitle.trim() || null,
    desktopImage: values.desktopImage.trim(),
    mobileImage: values.mobileImage.trim() || null,
    buttonText: values.buttonText.trim() || null,
    buttonLink: values.buttonLink.trim() || null,
    position: values.position,
    status: values.status,
    displayOrder: Math.round(Number(values.displayOrder)),
    startsAt: values.startsAt ? new Date(toISODateStart(values.startsAt)) : null,
    endsAt: values.endsAt ? new Date(toISODateEnd(values.endsAt)) : null,
  }
}

export async function createBannerEntry(values: BannerFormValues): Promise<Banner> {
  await requireAdminSession()
  assertValid(values)

  const data = parseBannerData(values)

  try {
    const created = await prisma.$transaction(async (tx: Tx) => tx.banner.create({ data }))
    return dbBannerToBanner(created)
  } catch (err) {
    throw err instanceof Error ? err : new Error('Could not create banner.')
  }
}

export async function updateBannerEntry(id: string, values: BannerFormValues): Promise<Banner> {
  await requireAdminSession()
  assertValid(values)

  const data = parseBannerData(values)

  try {
    const updated = await prisma.$transaction(async (tx: Tx) => {
      // Never trust that `id` (client-supplied) refers to a real row —
      // re-read it from the database inside the transaction.
      const existing = await tx.banner.findUnique({ where: { id } })
      if (!existing) throw new Error('Banner not found.')

      return tx.banner.update({ where: { id }, data })
    })
    return dbBannerToBanner(updated)
  } catch (err) {
    throw err instanceof Error ? err : new Error('Could not update banner.')
  }
}

export async function deleteBannerEntry(id: string): Promise<{ ok: true }> {
  await requireAdminSession()

  try {
    await prisma.banner.delete({ where: { id } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Banner not found.')
    }
    throw err instanceof Error ? err : new Error('Could not delete banner.')
  }
  return { ok: true }
}
