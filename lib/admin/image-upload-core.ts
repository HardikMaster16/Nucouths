// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Shared Image Upload Core
//
// Pure filesystem/validation logic shared by every admin image-upload
// Server Action (lib/admin/upload-image.actions.ts for product images,
// lib/admin/upload-banner-image.actions.ts for banner images). Not itself a
// 'use server' module — each caller is responsible for its own
// requireAdminSession() check before calling into this, so this file has no
// auth of its own and must never be imported from a client component.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // 4MB

/** Identifies the real image format from its own bytes (magic numbers), not
 *  the client-supplied File.type or filename extension — either of which an
 *  attacker fully controls. This is what actually prevents an executable or
 *  script being uploaded with a spoofed "image/png" content type. */
export function detectImageExtension(bytes: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'png'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // "WEBP"
  ) {
    return 'webp'
  }
  return null
}

/** Validates and writes one uploaded file under public/uploads/<subdir>/,
 *  returning the browser-accessible URL to store on the record
 *  (ProductImage.src, Banner.desktopImage/mobileImage, …). Throws a
 *  user-facing Error on any validation failure. Callers must run their own
 *  requireAdminSession() first — this function has no auth of its own. */
export async function saveUploadedImage(file: File, subdir: string): Promise<{ url: string }> {
  if (file.size === 0) throw new Error('That file is empty.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is too large — choose an image under 4MB.')

  const bytes = new Uint8Array(await file.arrayBuffer())
  const ext = detectImageExtension(bytes)
  if (!ext) throw new Error('Unsupported file — upload a JPG, PNG, or WEBP image.')

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', subdir)
  await mkdir(uploadDir, { recursive: true })

  const filename = `${randomUUID()}.${ext}`
  await writeFile(path.join(uploadDir, filename), bytes)

  return { url: `/uploads/${subdir}/${filename}` }
}
