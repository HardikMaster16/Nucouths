'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Banner Image Upload (local filesystem)
//
// Same fix as lib/admin/upload-image.actions.ts (product images), applied to
// the Banner form (components/admin/banners/BannerFormModal.tsx): its
// "Choose a file…" controls used to read the picked file into a base64
// data: URL and store that directly as Banner.desktopImage/mobileImage —
// never a real URL, and blocked by the storefront CSP the same way a
// data:-URL product image was. Writes into public/uploads/banners/ (see
// lib/admin/image-upload-core.ts) and returns a real /uploads/banners/<name>
// URL for the form to store instead.
// ─────────────────────────────────────────────────────────────────────────────

import { saveUploadedImage } from './image-upload-core'
import { requireAdminSession } from './auth/admin-session.actions'

/** Uploads one admin-selected banner image file (desktop or mobile),
 *  validates it server-side (real admin session, size cap, sniffed file
 *  type), and returns a stable, browser-accessible URL under
 *  /uploads/banners/ for the form to store as Banner.desktopImage or
 *  Banner.mobileImage. Throws a user-facing Error on any validation
 *  failure. */
export async function uploadBannerImageAction(formData: FormData): Promise<{ url: string }> {
  await requireAdminSession()

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('No file was provided.')

  return saveUploadedImage(file, 'banners')
}
