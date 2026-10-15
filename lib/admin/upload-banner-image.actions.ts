'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Banner Image Upload (Supabase Storage)
//
// Same fix as lib/admin/upload-image.actions.ts (product images), applied to
// the Banner form (components/admin/banners/BannerFormModal.tsx): uploads go
// to the shared public Supabase Storage bucket via
// lib/admin/image-upload-core.ts's saveUploadedImage, which returns a real,
// publicly-fetchable URL for the form to store as Banner.desktopImage or
// Banner.mobileImage.
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
