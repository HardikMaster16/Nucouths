// ─────────────────────────────────────────────────────────────────────────────
// One-off repair for Banner rows written before the upload fix
// (lib/admin/upload-banner-image.actions.ts): the old "Choose a file…"
// controls in components/admin/banners/BannerFormModal.tsx stored the
// picked file as a base64 data: URL directly in Banner.desktopImage/
// mobileImage, which the storefront's CSP (img-src 'self' — next.config.ts)
// blocks the browser from ever loading. This decodes any such field's
// base64 payload, writes it to public/uploads/banners/ (the same directory
// the fixed upload flow uses), and repoints the row at the resulting
// /uploads/banners/<file> URL. Safe to re-run — a second pass finds nothing
// left to migrate once every data: field has been converted.
//
// Run with: npx tsx scripts/migrate-data-url-banner-images.ts
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'banners')

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

async function migrateDataUrl(dataUrl: string): Promise<string | null> {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null

  const [, mime, base64] = match
  const ext = EXT_BY_MIME[mime]
  if (!ext) return null

  await mkdir(UPLOAD_DIR, { recursive: true })
  const filename = `${randomUUID()}.${ext}`
  await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(base64, 'base64'))
  return `/uploads/banners/${filename}`
}

async function main() {
  const rows = await prisma.banner.findMany({
    where: { OR: [{ desktopImage: { startsWith: 'data:' } }, { mobileImage: { startsWith: 'data:' } }] },
  })

  if (rows.length === 0) {
    console.log('No data: URL banner images found — nothing to migrate.')
    return
  }

  for (const row of rows) {
    const data: { desktopImage?: string; mobileImage?: string } = {}

    if (row.desktopImage.startsWith('data:')) {
      const url = await migrateDataUrl(row.desktopImage)
      if (url) {
        data.desktopImage = url
        console.log(`Migrated Banner ${row.id} desktopImage -> ${url}`)
      } else {
        console.warn(`Skipping Banner ${row.id} desktopImage — unrecognized/unsupported data URL.`)
      }
    }

    if (row.mobileImage?.startsWith('data:')) {
      const url = await migrateDataUrl(row.mobileImage)
      if (url) {
        data.mobileImage = url
        console.log(`Migrated Banner ${row.id} mobileImage -> ${url}`)
      } else {
        console.warn(`Skipping Banner ${row.id} mobileImage — unrecognized/unsupported data URL.`)
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.banner.update({ where: { id: row.id }, data })
    }
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
