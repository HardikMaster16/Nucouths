// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Banner Model + Service
//
// Visibility rules, form types, and validation live in lib/banner-form.ts
// (re-exported below so existing imports of this file keep working). Real
// persistence — both admin mutations and the storefront's own read — lives
// in Prisma:
//
//   Admin UI → this service → lib/banners.actions.ts
//                              (Prisma 'use server' actions) → PostgreSQL
//
//   Storefront (app/page.tsx) → lib/banners.db.ts's getVisibleBannersFromDb
//                                → PostgreSQL (same Banner table)
//
// SEED_BANNERS/getSeedBanners stay here purely for prisma/seed.ts, which
// reads it once to seed the real Banner table so the database starts from
// the same content the UI always showed. There is no other mock/
// localStorage fallback any more — the storefront homepage used to read a
// separate, disconnected getAllBanners()/getVisibleBanners() localStorage
// path (removed), which is why an admin-edited banner never appeared there.
// ─────────────────────────────────────────────────────────────────────────────

import { createBannerEntry, deleteBannerEntry, updateBannerEntry } from './banners.actions'
import { BannerValidationError, hasBannerFormErrors, validateBannerForm } from './banner-form'
import type { Banner, BannerFormValues } from './banner-form'

export * from './banner-form'

const SEED_BANNERS: Banner[] = [
  {
    id: 'banner-autumn-hero',
    title: 'Dressed for Every Moment',
    subtitle: 'Thoughtfully designed pieces that move with you through every occasion.',
    // Same image the hero already used before this page existed — no
    // unrelated/invented photography.
    desktopImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=85',
    buttonText: 'Shop New In',
    buttonLink: '/collections/new-in',
    position: 'hero',
    status: 'Active',
    displayOrder: 1,
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z',
  },
]

/** Used only by prisma/seed.ts to seed the real Banner table. */
export function getSeedBanners(): Banner[] {
  return SEED_BANNERS
}

// ─── Create / update / delete (real database, via Server Actions) ─────────

export async function createBanner(values: BannerFormValues): Promise<Banner> {
  const errors = validateBannerForm(values)
  if (hasBannerFormErrors(errors)) throw new BannerValidationError(errors)

  return createBannerEntry(values)
}

export async function updateBanner(id: string, values: BannerFormValues): Promise<Banner> {
  const errors = validateBannerForm(values)
  if (hasBannerFormErrors(errors)) throw new BannerValidationError(errors)

  return updateBannerEntry(id, values)
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteBannerEntry(id)
}
