// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Banner Model, Visibility Rules + Form Validation
//
// Pure, storage-agnostic logic shared by every Banner read/write path —
// admin mutations (lib/banners.actions.ts), the admin list's computed
// schedule state, and the storefront's own live-banner query
// (lib/banners.db.ts's getVisibleBannersFromDb) — deliberately depends on
// none of them, so importing this can never create a cycle (mirrors
// lib/admin/coupon-form.ts's role for Coupons).
// ─────────────────────────────────────────────────────────────────────────────

export type BannerPosition = 'hero' | 'secondary'
export type BannerStatus = 'Active' | 'Inactive'

export interface Banner {
  id: string
  title: string
  subtitle?: string
  desktopImage: string
  /** Falls back to desktopImage on the storefront when empty. */
  mobileImage?: string
  buttonText?: string
  buttonLink?: string
  position: BannerPosition
  status: BannerStatus
  /** 1 = shown first. Ties broken by id for a stable sort. */
  displayOrder: number
  /** undefined = visible from the moment it's Active. */
  startsAt?: string
  /** undefined = never expires. */
  endsAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Visibility ─────────────────────────────────────────────────────────────

/** A banner shows on the storefront only when Active AND within its
 *  start/end window — the one rule both the admin list's computed status
 *  and the homepage's filtering share, so they can never disagree about
 *  what "live" means. Pure — takes `now` explicitly so it's trivially
 *  testable and never depends on when it happens to be called. */
export function isBannerVisible(banner: Banner, now: number): boolean {
  if (banner.status !== 'Active') return false
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return false
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) return false
  return true
}

export type BannerScheduleState = 'Active' | 'Scheduled' | 'Expired' | 'Inactive'

/** The admin-facing state — same three date/status signals as
 *  isBannerVisible, just reported instead of collapsed to a boolean. */
export function computeBannerScheduleState(banner: Banner, now: number): BannerScheduleState {
  if (banner.status !== 'Active') return 'Inactive'
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return 'Scheduled'
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) return 'Expired'
  return 'Active'
}

/** Deterministic ordering — displayOrder first, id as a stable tiebreaker so
 *  two banners sharing a displayOrder never render in an arbitrary order
 *  across requests. */
export function byDisplayOrder(a: Banner, b: Banner): number {
  return a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)
}

/** The banners the storefront should actually render for a given slot,
 *  newest-rule-applied and in display order — the single function both
 *  app/page.tsx's hero and any future banner slot call. */
export function getVisibleBanners(banners: Banner[], position: BannerPosition, now: number = Date.now()): Banner[] {
  return banners.filter((b) => b.position === position && isBannerVisible(b, now)).sort(byDisplayOrder)
}

// ─── Form values + validation ───────────────────────────────────────────────

export interface BannerFormValues {
  title: string
  subtitle: string
  desktopImage: string
  mobileImage: string
  buttonText: string
  buttonLink: string
  position: BannerPosition
  status: BannerStatus
  displayOrder: string
  /** yyyy-mm-dd, matching <input type="date">. */
  startsAt: string
  endsAt: string
}

export function createInitialBannerForm(nextDisplayOrder: number): BannerFormValues {
  return {
    title: '',
    subtitle: '',
    desktopImage: '',
    mobileImage: '',
    buttonText: '',
    buttonLink: '',
    position: 'hero',
    status: 'Active',
    displayOrder: String(nextDisplayOrder),
    startsAt: '',
    endsAt: '',
  }
}

export function bannerToFormValues(banner: Banner): BannerFormValues {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    desktopImage: banner.desktopImage,
    mobileImage: banner.mobileImage ?? '',
    buttonText: banner.buttonText ?? '',
    buttonLink: banner.buttonLink ?? '',
    position: banner.position,
    status: banner.status,
    displayOrder: String(banner.displayOrder),
    startsAt: banner.startsAt ? banner.startsAt.slice(0, 10) : '',
    endsAt: banner.endsAt ? banner.endsAt.slice(0, 10) : '',
  }
}

export interface BannerFormErrors {
  title?: string
  desktopImage?: string
  buttonLink?: string
  displayOrder?: string
  endsAt?: string
  [key: string]: string | undefined
}

function isValidUrlOrPath(value: string): boolean {
  if (value.startsWith('/')) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** Single source of truth for what's required/valid — used identically for
 *  live client-side feedback and as the authoritative server-side check
 *  (lib/admin/banners.actions.ts), unlike Products/Categories/Coupons there
 *  is no uniqueness constraint on any Banner field, so there's no separate
 *  "shape vs authoritative" split needed here. Unchanged from the original
 *  mock rules. */
export function validateBannerForm(values: BannerFormValues): BannerFormErrors {
  const errors: BannerFormErrors = {}

  if (!values.title.trim()) errors.title = 'Title is required.'
  if (!values.desktopImage.trim()) errors.desktopImage = 'Desktop image is required.'

  if (values.buttonLink.trim() && !isValidUrlOrPath(values.buttonLink.trim())) {
    errors.buttonLink = 'Enter a valid link (e.g. /collections/new-in or https://…).'
  }

  const order = Number(values.displayOrder)
  if (!values.displayOrder.trim()) errors.displayOrder = 'Display order is required.'
  else if (!Number.isInteger(order) || order <= 0) errors.displayOrder = 'Enter a whole number, 1 or greater.'

  if (values.startsAt && values.endsAt && values.endsAt < values.startsAt) {
    errors.endsAt = 'End date cannot be before the start date.'
  }

  return errors
}

export function hasBannerFormErrors(errors: BannerFormErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export class BannerValidationError extends Error {
  errors: BannerFormErrors
  constructor(errors: BannerFormErrors) {
    super('Banner form validation failed')
    this.name = 'BannerValidationError'
    this.errors = errors
  }
}

export function toISODateStart(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString()
}
export function toISODateEnd(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.000Z`).toISOString()
}
