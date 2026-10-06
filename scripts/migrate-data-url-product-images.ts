// ─────────────────────────────────────────────────────────────────────────────
// One-off repair for ProductImage rows written before the upload fix
// (lib/admin/upload-image.actions.ts): the old "Choose a file…" control
// stored the picked file as a base64 data: URL directly in ProductImage.src,
// which the storefront's CSP (img-src 'self' — next.config.ts) blocks the
// browser from ever loading. This decodes any such row's base64 payload,
// writes it to public/uploads/products/ (the same directory the fixed
// upload flow uses), and repoints the row at the resulting /uploads/
// products/<file> URL. Safe to re-run — a second pass finds nothing left to
// migrate once every data: row has been converted.
//
// Run with: npx tsx scripts/migrate-data-url-product-images.ts
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products')

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

async function main() {
  const rows = await prisma.productImage.findMany({ where: { src: { startsWith: 'data:' } } })

  if (rows.length === 0) {
    console.log('No data: URL product images found — nothing to migrate.')
    return
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  for (const row of rows) {
    const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(row.src)
    if (!match) {
      console.warn(`Skipping ProductImage ${row.id} — unrecognized data URL format.`)
      continue
    }

    const [, mime, base64] = match
    const ext = EXT_BY_MIME[mime]
    if (!ext) {
      console.warn(`Skipping ProductImage ${row.id} — unsupported mime type "${mime}".`)
      continue
    }

    const filename = `${randomUUID()}.${ext}`
    await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(base64, 'base64'))

    const url = `/uploads/products/${filename}`
    await prisma.productImage.update({ where: { id: row.id }, data: { src: url } })
    console.log(`Migrated ProductImage ${row.id} (product ${row.productId}) -> ${url}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
