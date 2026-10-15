// ─────────────────────────────────────────────────────────────────────────────
// One-off backfill for ProductImage/Banner rows still pointing at the old
// local-filesystem upload path (/uploads/products/<file>,
// /uploads/banners/<file>) from before the Supabase Storage migration (see
// lib/admin/image-upload-core.ts, lib/admin/supabase-storage.ts). Those
// paths 404 on Hostinger — public/uploads/* is never shipped to the server
// (.gitignore) and doesn't survive a redeploy even when it is briefly
// present — so this only helps for rows whose original file still exists on
// THIS machine (wherever it was uploaded from) under public/uploads/.
//
// For each such row: reads the local file, uploads its bytes to the shared
// Supabase Storage bucket (lib/admin/supabase-storage.ts) under the same
// products/<file> or banners/<file> path, and repoints the row at the
// resulting public URL. Rows whose local file is missing are skipped with a
// warning — there's nothing to migrate them from.
//
// Safe to re-run — a second pass finds nothing left with a /uploads/ src.
//
// Run with: npx tsx scripts/migrate-local-uploads-to-supabase.ts
// ─────────────────────────────────────────────────────────────────────────────

import { readFile } from 'fs/promises'
import path from 'path'
import { prisma } from '../lib/prisma'
import { uploadImageToSupabaseStorage } from '../lib/admin/supabase-storage'

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/** `/uploads/products/<file>` -> uploads the local file at
 *  public/uploads/products/<file> to Supabase at products/<file> and
 *  returns its public URL, or null if the local file is missing/unreadable
 *  or the path isn't one of this app's recognized upload subdirs. */
async function migrateLocalUploadPath(src: string): Promise<string | null> {
  const match = /^\/uploads\/(products|banners)\/([^/]+)$/.exec(src)
  if (!match) return null

  const [, subdir, filename] = match
  const ext = path.extname(filename).toLowerCase()
  const contentType = CONTENT_TYPE_BY_EXT[ext]
  if (!contentType) {
    console.warn(`Skipping ${src} — unrecognized file extension "${ext}".`)
    return null
  }

  const localPath = path.join(process.cwd(), 'public', 'uploads', subdir, filename)
  let bytes: Buffer
  try {
    bytes = await readFile(localPath)
  } catch {
    console.warn(`Skipping ${src} — no local file found at ${localPath}.`)
    return null
  }

  return uploadImageToSupabaseStorage(new Uint8Array(bytes), `${subdir}/${filename}`, contentType)
}

async function migrateProductImages(): Promise<void> {
  const rows = await prisma.productImage.findMany({ where: { src: { startsWith: '/uploads/' } } })
  if (rows.length === 0) {
    console.log('No local-upload ProductImage rows found — nothing to migrate.')
    return
  }

  for (const row of rows) {
    const url = await migrateLocalUploadPath(row.src)
    if (!url) continue
    await prisma.productImage.update({ where: { id: row.id }, data: { src: url } })
    console.log(`Migrated ProductImage ${row.id} (product ${row.productId}) -> ${url}`)
  }
}

async function migrateBanners(): Promise<void> {
  const rows = await prisma.banner.findMany({
    where: {
      OR: [{ desktopImage: { startsWith: '/uploads/' } }, { mobileImage: { startsWith: '/uploads/' } }],
    },
  })
  if (rows.length === 0) {
    console.log('No local-upload Banner rows found — nothing to migrate.')
    return
  }

  for (const row of rows) {
    const data: { desktopImage?: string; mobileImage?: string } = {}

    if (row.desktopImage.startsWith('/uploads/')) {
      const url = await migrateLocalUploadPath(row.desktopImage)
      if (url) {
        data.desktopImage = url
        console.log(`Migrated Banner ${row.id} desktopImage -> ${url}`)
      }
    }

    if (row.mobileImage?.startsWith('/uploads/')) {
      const url = await migrateLocalUploadPath(row.mobileImage)
      if (url) {
        data.mobileImage = url
        console.log(`Migrated Banner ${row.id} mobileImage -> ${url}`)
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.banner.update({ where: { id: row.id }, data })
    }
  }
}

async function main() {
  await migrateProductImages()
  await migrateBanners()
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
