'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Product Image Upload (Supabase Storage)
//
// Backs the "Choose a file…" control in components/admin/products/form/
// ImagesSection.tsx. lib/admin/image-upload-core.ts's saveUploadedImage does
// the real work — validates the file server-side, then uploads it to the
// shared public Supabase Storage bucket (lib/admin/supabase-storage.ts) and
// returns its public URL for the form to store as ProductImage.src. Storing
// in Supabase (rather than Hostinger's local disk) means a new product
// image is live immediately, with no manual file upload to the server and
// no redeploy — and survives across redeploys/restarts, unlike
// public/uploads/ (see that directory's .gitignore entry).
// ─────────────────────────────────────────────────────────────────────────────

import { saveUploadedImage } from './image-upload-core'
import { requireAdminSession } from './auth/admin-session.actions'

/** Uploads one admin-selected product image file, validates it server-side
 *  (real admin session, size cap, sniffed file type), and returns a stable,
 *  browser-accessible URL under /uploads/products/ for the form to store as
 *  ProductImage.src. Throws a user-facing Error on any validation failure. */
export async function uploadProductImageAction(formData: FormData): Promise<{ url: string }> {
  await requireAdminSession()

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('No file was provided.')

  return saveUploadedImage(file, 'products')
}
