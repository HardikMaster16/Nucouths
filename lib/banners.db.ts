// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Banner Reads (Prisma)
//
// listAdminBanners backs /admin/banners (admin session required). It's
// imported from that Server Component and from lib/banners.actions.ts's
// Server Actions — never from a 'use client' component, so Prisma is never
// pulled into a browser bundle.
//
// getVisibleBannersFromDb is the real storefront read path — app/page.tsx
// (via components/home/HeroBanner.tsx) calls it directly, no admin session
// required. This replaces the old mock/localStorage
// getVisibleBanners(getAllBanners(), ...) path (lib/banners.ts), which never
// touched the database at all — an admin edit in Admin → Banners wrote to
// Prisma correctly, but the homepage kept reading a hardcoded seed array
// (server render) plus a per-browser localStorage copy of it (client
// re-fetch), so it could never reflect a real database change.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './admin/auth/admin-session.actions'
import { getVisibleBanners } from './banner-form'
import type { Banner, BannerPosition } from './banner-form'

export function dbBannerToBanner(b: Prisma.BannerGetPayload<object>): Banner {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle ?? undefined,
    desktopImage: b.desktopImage,
    mobileImage: b.mobileImage ?? undefined,
    buttonText: b.buttonText ?? undefined,
    buttonLink: b.buttonLink ?? undefined,
    position: b.position,
    status: b.status,
    displayOrder: b.displayOrder,
    startsAt: b.startsAt ? b.startsAt.toISOString() : undefined,
    endsAt: b.endsAt ? b.endsAt.toISOString() : undefined,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}

/** All banners, ordered deterministically (displayOrder, then id as a
 *  tiebreaker) — the exact same ordering rule lib/banner-form.ts's
 *  byDisplayOrder/getVisibleBanners already use for the mock/storefront
 *  path, so admin and storefront never disagree about "what order".
 *  Requires an admin session — app/admin/(dashboard)/banners/page.tsx has
 *  no guard of its own (the client-side AdminShell redirect doesn't stop a
 *  Server Component's data fetch from running or reaching the RSC payload —
 *  see Next.js's own authentication guide), so the check happens here,
 *  right at the data source. */
export async function listAdminBanners(): Promise<Banner[]> {
  await requireAdminSession()
  const rows = await prisma.banner.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] })
  return rows.map(dbBannerToBanner)
}

/** The live banners for a given slot (e.g. 'hero') — Active status AND
 *  within any configured start/end window, in display order. Reuses
 *  lib/banner-form.ts's getVisibleBanners (the exact same visibility/
 *  ordering rule the admin list's computed status already uses) rather
 *  than re-implementing it, so "what counts as live" can never drift
 *  between admin and storefront. No admin session — this is a public,
 *  customer-facing read. */
export async function getVisibleBannersFromDb(position: BannerPosition, now: number = Date.now()): Promise<Banner[]> {
  const rows = await prisma.banner.findMany({ where: { position } })
  return getVisibleBanners(rows.map(dbBannerToBanner), position, now)
}
