'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Product Image Upload (local filesystem)
//
// Backs the "Choose a file…" control in components/admin/products/form/
// ImagesSection.tsx. Previously that control read the file into a base64
// data: URL and stored it directly as ProductImage.src — never a real,
// browser-fetchable URL, and blocked outright by the storefront's CSP
// (`img-src 'self'` — see next.config.ts) once next/image tried to render
// it. This action instead copies the file into public/uploads/products/
// (served by Next.js as a normal static asset at /uploads/products/<name>,
// same-origin, so no CSP or images.remotePatterns change is needed) and
// returns that URL for the form to store instead.
//
// Deployment target is a persistent Node process (see DEPLOYMENT.md —
// `npm run build && npm run start` behind Hostinger's own process manager,
// not a serverless/ephemeral filesystem platform), so local disk storage
// under public/ is durable across requests. If this app ever moves to a
// serverless host, lib/admin/image-upload-core.ts's saveUploadedImage is the
// one function to swap for a cloud-storage (S3/R2/Cloudinary) upload — every
// caller only depends on getting back a { url } string, not on how it was
// stored.
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
