// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Product Reads (Prisma)
//
// Server-only reads backing /admin/products, /admin/products/[id],
// /admin/products/[id]/edit, and /admin/products/new. Imported only from
// Server Components (the app/admin/(dashboard)/products/** page.tsx files)
// and from lib/admin/products.actions.ts's Server Actions — never from a
// 'use client' component, so Prisma is never pulled into a browser bundle.
//
// Field mapping notes (see prisma/schema.prisma and prisma/seed.ts, which
// this mirrors exactly):
//   - Product.category (lib/types.ts, a plain string like "men") is
//     Category.slug, not Category.id.
//   - Product.collection (a display name like "Autumn / Winter 2025") is
//     Collection.name, not Collection.slug — lib/collections.ts's
//     COLLECTIONS keeps the two separate on purpose (see prisma/seed.ts's
//     seedCollections).
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/cart-pricing'
import { variantStockState } from '@/lib/product-detail-data'
import { categoryLabel, formatUpdatedAt } from './products'
import { requireAdminSession } from './auth/admin-session.actions'
import type { AdminProductRow } from './products'
import type { ProductColor, ProductDetail, ProductImage as FrontendImage, ProductVariant as FrontendVariant } from '@/lib/types'

export const productWithRelations = {
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { orderBy: { createdAt: 'asc' } },
  category: true,
  collection: true,
} satisfies Prisma.ProductInclude

export type DbProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productWithRelations }>

function decimalToNumber(value: Prisma.Decimal | null | undefined): number | undefined {
  return value === null || value === undefined ? undefined : Number(value)
}

/** Maps a Prisma Product (with relations) onto the exact ProductDetail shape
 *  the PDP/admin detail view/edit form already use — see the module
 *  docstring above for the category/collection field mapping. */
export function dbProductToDetail(p: DbProductWithRelations): ProductDetail {
  const images: FrontendImage[] = p.images.map((img) => ({ src: img.src, alt: img.alt }))
  const nonEmptyImages = (images.length ? images : [{ src: '', alt: p.name }]) as [FrontendImage, ...FrontendImage[]]
  const hoverImage = p.images.find((img) => img.isHover)

  const colors: ProductColor[] = []
  const seenColors = new Set<string>()
  const orderedSizes: string[] = []
  const seenSizes = new Set<string>()

  const variants: FrontendVariant[] = p.variants.map((v) => {
    if (!seenColors.has(v.color)) {
      seenColors.add(v.color)
      colors.push({ name: v.color, hex: v.colorHex })
    }
    if (!seenSizes.has(v.size)) {
      seenSizes.add(v.size)
      orderedSizes.push(v.size)
    }
    return {
      id: v.id,
      sku: v.sku,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      stock: v.stock,
      priceOverride: decimalToNumber(v.priceOverride),
    }
  })

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand ?? undefined,
    category: p.category?.slug ?? '',
    subcategory: p.subcategory ?? undefined,
    collection: p.collection?.name ?? undefined,
    price: Number(p.price),
    compareAtPrice: decimalToNumber(p.compareAtPrice),
    currency: p.currency,
    images: nonEmptyImages,
    hoverImage: hoverImage ? { src: hoverImage.src, alt: hoverImage.alt } : undefined,
    colors: colors.length ? colors : undefined,
    badge: (p.badge as ProductDetail['badge']) ?? undefined,
    newIn: p.newIn,
    inStock: p.inStock,
    sizes: orderedSizes.length ? orderedSizes : undefined,
    description: p.description ?? undefined,
    tags: p.tags.length ? p.tags : undefined,
    variants,
    shortDescription: p.shortDescription ?? '',
    details: p.details,
    materials: p.materials,
    care: p.care,
    shipping: p.shipping ?? '',
    returns: p.returns ?? '',
  }
}

/** Maps a Prisma Product (with relations) onto the admin listing/table row
 *  shape (lib/admin/products.ts's AdminProductRow) — reuses that file's
 *  pure categoryLabel/formatUpdatedAt helpers so a DB-backed row and a
 *  mock-backed row (still used by the Inventory fallback) format
 *  identically. */
export function dbProductToAdminRow(p: DbProductWithRelations): AdminProductRow {
  const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0)
  const primaryImage = p.images.find((img) => img.isPrimary) ?? p.images[0]
  const categorySlug = p.category?.slug ?? ''
  const updatedAt = p.updatedAt.toISOString()
  const price = Number(p.price)

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: primaryImage ? { src: primaryImage.src, alt: primaryImage.alt } : { src: '', alt: p.name },
    category: categorySlug,
    categoryLabel: categoryLabel(categorySlug),
    price,
    priceFormatted: formatPrice(price, p.currency),
    currency: p.currency,
    sku: `NCT-${p.id.toUpperCase()}`,
    variantCount: p.variants.length,
    totalStock,
    stockState: variantStockState(totalStock),
    status: p.inStock ? 'Active' : 'Inactive',
    updatedAt,
    updatedAtFormatted: formatUpdatedAt(updatedAt),
  }
}

/** All products in the catalog, shaped for the admin listing/table. Requires
 *  an admin session — the app/admin/(dashboard)/** page.tsx Server
 *  Components that call this have no guard of their own (the client-side
 *  AdminShell redirect doesn't stop a Server Component's data fetch from
 *  running or from reaching the RSC payload — see Next.js's own
 *  authentication guide), so every exported read in this file checks here,
 *  right at the data source. */
export async function listAdminProducts(): Promise<AdminProductRow[]> {
  await requireAdminSession()
  const rows = await prisma.product.findMany({ include: productWithRelations, orderBy: { updatedAt: 'desc' } })
  return rows.map(dbProductToAdminRow)
}

/** Single product by id, for the admin detail/edit pages. Returns undefined
 *  when no product with that id exists. Requires an admin session — see
 *  listAdminProducts's docstring above. */
export async function getAdminProductWithDetail(id: string): Promise<{ row: AdminProductRow; detail: ProductDetail } | undefined> {
  await requireAdminSession()
  const p = await prisma.product.findUnique({ where: { id }, include: productWithRelations })
  if (!p) return undefined
  return { row: dbProductToAdminRow(p), detail: dbProductToDetail(p) }
}

/** Active categories, for the Add/Edit Product form's Category select and
 *  the listing's filter — `value` is the slug Product.category maps to.
 *  Requires an admin session — see listAdminProducts's docstring above. */
export async function listAdminCategories(): Promise<{ value: string; label: string }[]> {
  await requireAdminSession()
  const rows = await prisma.category.findMany({ where: { status: 'Active' }, orderBy: { name: 'asc' } })
  return rows.map((c) => ({ value: c.slug, label: c.name }))
}

/** Distinct product types (Product.subcategory) present in the catalog, for
 *  the Add/Edit Product form's suggestions. Requires an admin session — see
 *  listAdminProducts's docstring above. */
export async function listAdminProductTypes(): Promise<string[]> {
  await requireAdminSession()
  const rows = await prisma.product.findMany({
    where: { subcategory: { not: null } },
    select: { subcategory: true },
    distinct: ['subcategory'],
  })
  return rows
    .map((r) => r.subcategory)
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => a.localeCompare(b))
}

/** Active collections' names, for the Add/Edit Product form's Collection
 *  select — the form value is the collection *name* (e.g. "Resort Edit"),
 *  matching Product.collection, not Collection.slug. Requires an admin
 *  session — see listAdminProducts's docstring above. */
export async function listAdminCollections(): Promise<string[]> {
  await requireAdminSession()
  const rows = await prisma.collection.findMany({ where: { status: 'Active' }, orderBy: { name: 'asc' } })
  return rows.map((c) => c.name)
}
