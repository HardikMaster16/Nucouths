'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Product Mutations (Prisma)
//
// The real persistence behind lib/admin/product-service.ts's
// createProduct/updateProduct, and behind the Products listing's delete
// action. Every export here is a Server Action reachable directly as a POST
// endpoint (see the Next.js Server Actions security guide) — so each one:
//
//   1. Calls requireAdminSession() first, unconditionally. The product id
//      a client passes is only ever used to select *which* row to act on,
//      never to decide *whether* the caller is allowed to act at all.
//   2. Re-validates the form (never trusts that the client's own
//      validateProductForm actually ran).
//   3. Re-checks slug/SKU uniqueness against the real database inside a
//      transaction, with the database's own unique constraints as the final
//      backstop (see the P2002 handling below) — lib/admin/product-form.ts's
//      isSlugTaken is only a best-effort, instant client-side check against
//      the seed catalog + localStorage, not the database.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './auth/admin-session.actions'
import { isVariantDraftComplete, ProductValidationError } from './product-form'
import { dbProductToAdminRow, productWithRelations } from './products.db'
import type { DbProductWithRelations } from './products.db'
import type { ProductFormValues } from './product-form'
import type { AdminProductRow } from './products'

type Tx = Prisma.TransactionClient

/** Prisma's default interactive-transaction timeout (5s) is tight for this
 *  module's create/update transactions once a product has more than a
 *  handful of variants — each one costs its own SKU-conflict round trip
 *  (and, on update, its own upsert round trip too), sequential by design
 *  (see the update transaction's variant loop below) since they can't be
 *  batched through Prisma's API. The color-group variant builder
 *  (components/admin/products/form/VariantsSection.tsx) makes generating a
 *  full size run across several colors in one save the common case, so a
 *  product with 10+ variants is now routine rather than rare — raised well
 *  above what even a slow connection to the real database needs for that,
 *  rather than trimming the margin closer with every catalog change. */
const TRANSACTION_OPTIONS = { timeout: 20_000 }

interface ParsedImage {
  src: string
  alt: string
  isPrimary: boolean
  isHover: boolean
  sortOrder: number
}

interface ParsedVariant {
  sku: string
  color: string
  colorHex: string
  size: string
  stock: number
  priceOverride: Prisma.Decimal | null
}

/** Product.materials/details/care are String[] columns (prisma/schema.prisma);
 *  the form edits them as one bullet per line (lib/admin/product-form.ts's
 *  ProductFormValues), so this is the single place that line-delimited text
 *  becomes the actual array — trims each line and drops blanks, shared by
 *  create and update so the two can never parse it differently. */
function parseBulletList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseImages(values: ProductFormValues, name: string): ParsedImage[] {
  return values.images
    .filter((img) => img.src.trim())
    .map((img, index) => ({
      src: img.src.trim(),
      alt: img.alt.trim() || name,
      isPrimary: index === 0,
      isHover: false,
      sortOrder: index,
    }))
}

function parseVariants(values: ProductFormValues): ParsedVariant[] {
  return values.variants
    .filter(isVariantDraftComplete)
    .map((v) => ({
      sku: v.sku.trim(),
      color: v.color.trim(),
      colorHex: v.colorHex || '#111111',
      size: v.size.trim(),
      stock: Math.max(0, Math.round(Number(v.stock) || 0)),
      priceOverride: v.priceOverride.trim() ? new Prisma.Decimal(v.priceOverride) : null,
    }))
}

/** Product.category is stored as a relation, but the form's value is the
 *  Category *slug* (see lib/admin/products.db.ts's module docstring).
 *  Throws ProductValidationError — a field the form already highlights —
 *  rather than a generic error, since this can only happen if the
 *  category was deleted between page load and submit. */
async function resolveCategoryId(tx: Tx, categorySlug: string): Promise<string> {
  const category = await tx.category.findUnique({ where: { slug: categorySlug } })
  if (!category) {
    throw new ProductValidationError({ category: 'This category no longer exists — refresh the page and try again.' })
  }
  return category.id
}

/** Product.collection is stored as a relation, but the form's value is the
 *  Collection *name*, not its slug (same reasoning as resolveCategoryId).
 *  No dedicated "collection" field exists on ProductFormErrors, so an
 *  unresolvable collection throws a plain Error (surfaced as the form's
 *  generic submit-error banner) rather than a field-level one. */
async function resolveCollectionId(tx: Tx, collectionName: string): Promise<string | null> {
  const trimmed = collectionName.trim()
  if (!trimmed) return null
  const collection = await tx.collection.findFirst({ where: { name: trimmed } })
  if (!collection) throw new Error('This collection no longer exists — refresh the page and try again.')
  return collection.id
}

/** Turns a Prisma unique-constraint violation into the same UI-facing shape
 *  the rest of this module throws, using the violated constraint's target
 *  columns to tell a slug conflict from a SKU/variant conflict — the final
 *  backstop behind the explicit pre-checks inside each transaction below. */
function rethrowAsUserFacingError(err: unknown, fallbackMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target ?? '')
    if (target.includes('slug')) throw new ProductValidationError({ slug: 'This slug is already in use — choose another.' })
    if (target.includes('sku')) throw new Error('One of the variant SKUs is already in use — choose another.')
    throw new Error('A variant with the same color and size already exists for this product.')
  }
  if (err instanceof Error) throw err
  throw new Error(fallbackMessage)
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createProductInDb(values: ProductFormValues): Promise<AdminProductRow> {
  await requireAdminSession()

  const slug = values.slug.trim()
  const name = values.name.trim()
  const price = new Prisma.Decimal(values.price)
  const compareAtPrice = values.compareAtPrice.trim() ? new Prisma.Decimal(values.compareAtPrice) : null
  const description = values.description.trim() || null
  const images = parseImages(values, name)
  const variants = parseVariants(values)
  const materials = parseBulletList(values.materials)
  const details = parseBulletList(values.details)
  const care = parseBulletList(values.care)
  const shipping = values.shipping.trim() || null
  const returns = values.returns.trim() || null

  if (images.length === 0) throw new ProductValidationError({ images: 'Add at least one product image.' })

  try {
    const created: DbProductWithRelations = await prisma.$transaction(async (tx: Tx) => {
      const slugConflict = await tx.product.findUnique({ where: { slug } })
      if (slugConflict) throw new ProductValidationError({ slug: 'This slug is already in use — choose another.' })

      for (const v of variants) {
        const skuConflict = await tx.productVariant.findUnique({ where: { sku: v.sku } })
        if (skuConflict) throw new Error(`SKU "${v.sku}" is already in use — choose another.`)
      }

      const categoryId = await resolveCategoryId(tx, values.category.trim())
      const collectionId = await resolveCollectionId(tx, values.collection)

      return tx.product.create({
        data: {
          name,
          slug,
          categoryId,
          subcategory: values.productType.trim() || null,
          collectionId,
          price,
          compareAtPrice,
          currency: 'INR',
          description,
          shortDescription: description ? description.slice(0, 140) : `${name} — newly added to the NUCOUTHS catalog.`,
          details,
          materials,
          care,
          shipping,
          returns,
          inStock: values.status === 'Active',
          newIn: values.newIn,
          images: { create: images },
          variants: { create: variants },
        },
        include: productWithRelations,
      })
    }, TRANSACTION_OPTIONS)

    return dbProductToAdminRow(created)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not create product.')
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateProductInDb(id: string, values: ProductFormValues): Promise<AdminProductRow> {
  await requireAdminSession()

  const slug = values.slug.trim()
  const name = values.name.trim()
  const price = new Prisma.Decimal(values.price)
  const compareAtPrice = values.compareAtPrice.trim() ? new Prisma.Decimal(values.compareAtPrice) : null
  const description = values.description.trim() || null
  const images = parseImages(values, name)
  const variants = parseVariants(values)
  const materials = parseBulletList(values.materials)
  const details = parseBulletList(values.details)
  const care = parseBulletList(values.care)
  const shipping = values.shipping.trim() || null
  const returns = values.returns.trim() || null

  if (images.length === 0) throw new ProductValidationError({ images: 'Add at least one product image.' })

  try {
    const updated: DbProductWithRelations = await prisma.$transaction(async (tx: Tx) => {
      // Never trust that `id` (client-supplied) refers to a real row —
      // re-read it from the database inside the transaction rather than
      // relying on anything the caller sent beyond this reference.
      const existing = await tx.product.findUnique({ where: { id } })
      if (!existing) throw new Error('Product not found.')

      const slugConflict = await tx.product.findFirst({ where: { slug, NOT: { id } } })
      if (slugConflict) throw new ProductValidationError({ slug: 'This slug is already in use — choose another.' })

      for (const v of variants) {
        const skuConflict = await tx.productVariant.findFirst({ where: { sku: v.sku, NOT: { productId: id } } })
        if (skuConflict) throw new Error(`SKU "${v.sku}" is already in use — choose another.`)
      }

      const categoryId = await resolveCategoryId(tx, values.category.trim())
      const collectionId = await resolveCollectionId(tx, values.collection)

      await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          categoryId,
          subcategory: values.productType.trim() || null,
          collectionId,
          price,
          compareAtPrice,
          description,
          shortDescription: description ? description.slice(0, 140) : existing.shortDescription,
          inStock: values.status === 'Active',
          newIn: values.newIn,
          details,
          materials,
          care,
          shipping,
          returns,
        },
      })

      // Images: replace wholesale — same "replace-on-write" approach
      // prisma/seed.ts uses for the same relation, simpler than diffing a
      // handful of URL/alt rows against the form's draft list.
      await tx.productImage.deleteMany({ where: { productId: id } })
      await tx.productImage.createMany({ data: images.map((img) => ({ ...img, productId: id })) })

      // Variants: upsert by SKU (the real identity a warehouse/SKU label
      // cares about), then drop rows for any SKU the form no longer lists.
      const keepSkus = variants.map((v) => v.sku)
      await tx.productVariant.deleteMany({ where: { productId: id, sku: { notIn: keepSkus.length ? keepSkus : [''] } } })
      for (const v of variants) {
        await tx.productVariant.upsert({
          where: { sku: v.sku },
          update: { productId: id, color: v.color, colorHex: v.colorHex, size: v.size, stock: v.stock, priceOverride: v.priceOverride },
          create: { ...v, productId: id },
        })
      }

      return tx.product.findUniqueOrThrow({ where: { id }, include: productWithRelations })
    }, TRANSACTION_OPTIONS)

    return dbProductToAdminRow(updated)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not update product.')
  }
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteProductAction(id: string): Promise<{ ok: true }> {
  await requireAdminSession()

  try {
    await prisma.product.delete({ where: { id } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Product not found.')
    }
    throw err instanceof Error ? err : new Error('Could not delete product.')
  }

  return { ok: true }
}
