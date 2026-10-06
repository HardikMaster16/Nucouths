'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Category/Collection Mutations (Prisma)
//
// The real persistence behind lib/admin/taxonomy.ts's
// createTaxonomyEntry/updateTaxonomyEntry/deleteTaxonomyEntry. Every export
// here is a Server Action reachable directly as a POST endpoint, so each one:
//
//   1. Calls requireAdminSession() first, unconditionally — the same guard
//      lib/admin/products.actions.ts uses, so Products and Categories/
//      Collections mutations share one admin-authorization mechanism.
//   2. Re-validates the form shape (never trusts that the client's own
//      validation actually ran).
//   3. Re-checks slug (and, for collections, name) uniqueness against the
//      real database inside a transaction, with the database's own unique
//      constraint on Category.slug/Collection.slug as the final backstop —
//      lib/admin/taxonomy.ts's validateTaxonomyForm is only a best-effort,
//      instant client-side check against the seed catalog + localStorage.
//   4. Guards delete against orphaning products: Product.categoryId /
//      Product.collectionId are ON DELETE SET NULL at the database level
//      (prisma/migrations/20260921112841_init), so a delete could never
//      leave a dangling reference either way — but silently stripping a
//      product's category/collection out from under it is still a real
//      catalog change an admin shouldn't do by accident, so delete is
//      blocked (TaxonomyDeleteBlockedError) whenever productCount > 0,
//      checked and enforced inside the same transaction as the delete.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from './auth/admin-session.actions'
import { TaxonomyDeleteBlockedError, TaxonomyValidationError, validateTaxonomyFormShape, hasTaxonomyFormErrors } from './taxonomy-form'
import { categoryToTaxonomyRow, collectionToTaxonomyRow } from './taxonomy.db'
import type { TaxonomyFormValues, TaxonomyRow } from './taxonomy-form'

type Tx = Prisma.TransactionClient

const withProductCount = { _count: { select: { products: true } } } satisfies Prisma.CategoryInclude &
  Prisma.CollectionInclude

/** Turns a Prisma unique-constraint violation into the same UI-facing shape
 *  the rest of this module throws — the final backstop behind the explicit
 *  pre-checks inside each transaction below. */
function rethrowAsUserFacingError(err: unknown, fallbackMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new TaxonomyValidationError({ slug: 'This slug is already in use — choose another.' })
  }
  if (err instanceof Error) throw err
  throw new Error(fallbackMessage)
}

function assertValidShape(values: TaxonomyFormValues): void {
  const errors = validateTaxonomyFormShape(values)
  if (hasTaxonomyFormErrors(errors)) throw new TaxonomyValidationError(errors)
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function createCategoryEntry(values: TaxonomyFormValues): Promise<TaxonomyRow> {
  await requireAdminSession()
  assertValidShape(values)

  const name = values.name.trim()
  const slug = values.slug.trim()

  try {
    const created = await prisma.$transaction(async (tx: Tx) => {
      const slugConflict = await tx.category.findUnique({ where: { slug } })
      if (slugConflict) throw new TaxonomyValidationError({ slug: 'This slug is already in use — choose another.' })

      return tx.category.create({ data: { name, slug, status: values.status }, include: withProductCount })
    })
    return categoryToTaxonomyRow(created)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not create category.')
  }
}

export async function updateCategoryEntry(id: string, values: TaxonomyFormValues): Promise<TaxonomyRow> {
  await requireAdminSession()
  assertValidShape(values)

  const name = values.name.trim()
  const slug = values.slug.trim()

  try {
    const updated = await prisma.$transaction(async (tx: Tx) => {
      // Never trust that `id` (client-supplied) refers to a real row —
      // re-read it from the database inside the transaction.
      const existing = await tx.category.findUnique({ where: { id } })
      if (!existing) throw new Error('Category not found.')

      const slugConflict = await tx.category.findFirst({ where: { slug, NOT: { id } } })
      if (slugConflict) throw new TaxonomyValidationError({ slug: 'This slug is already in use — choose another.' })

      return tx.category.update({ where: { id }, data: { name, slug, status: values.status }, include: withProductCount })
    })
    return categoryToTaxonomyRow(updated)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not update category.')
  }
}

export async function deleteCategoryEntry(id: string): Promise<{ ok: true }> {
  await requireAdminSession()

  try {
    await prisma.$transaction(async (tx: Tx) => {
      const existing = await tx.category.findUnique({ where: { id }, include: withProductCount })
      if (!existing) throw new Error('Category not found.')
      if (existing._count.products > 0) throw new TaxonomyDeleteBlockedError(existing._count.products)

      await tx.category.delete({ where: { id } })
    })
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not delete category.')
  }
  return { ok: true }
}

// ─── Collections ────────────────────────────────────────────────────────────
// Product.collection (the frontend string, e.g. "Resort Edit") resolves to
// Collection.name, not Collection.slug (see lib/admin/products.db.ts's
// module docstring and prisma/seed.ts's seedCollections) — and
// lib/admin/products.actions.ts's resolveCollectionId looks a collection up
// by that name. The schema doesn't put a unique constraint on
// Collection.name (only slug), so name uniqueness is enforced here instead,
// at the application level, to keep that lookup unambiguous.

export async function createCollectionEntry(values: TaxonomyFormValues): Promise<TaxonomyRow> {
  await requireAdminSession()
  assertValidShape(values)

  const name = values.name.trim()
  const slug = values.slug.trim()
  const description = values.description.trim() || null

  try {
    const created = await prisma.$transaction(async (tx: Tx) => {
      const slugConflict = await tx.collection.findUnique({ where: { slug } })
      if (slugConflict) throw new TaxonomyValidationError({ slug: 'This slug is already in use — choose another.' })

      const nameConflict = await tx.collection.findFirst({ where: { name } })
      if (nameConflict) throw new TaxonomyValidationError({ name: 'This name is already in use — choose another.' })

      return tx.collection.create({ data: { name, slug, description, status: values.status }, include: withProductCount })
    })
    return collectionToTaxonomyRow(created)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not create collection.')
  }
}

export async function updateCollectionEntry(id: string, values: TaxonomyFormValues): Promise<TaxonomyRow> {
  await requireAdminSession()
  assertValidShape(values)

  const name = values.name.trim()
  const slug = values.slug.trim()
  const description = values.description.trim() || null

  try {
    const updated = await prisma.$transaction(async (tx: Tx) => {
      const existing = await tx.collection.findUnique({ where: { id } })
      if (!existing) throw new Error('Collection not found.')

      const slugConflict = await tx.collection.findFirst({ where: { slug, NOT: { id } } })
      if (slugConflict) throw new TaxonomyValidationError({ slug: 'This slug is already in use — choose another.' })

      const nameConflict = await tx.collection.findFirst({ where: { name, NOT: { id } } })
      if (nameConflict) throw new TaxonomyValidationError({ name: 'This name is already in use — choose another.' })

      return tx.collection.update({
        where: { id },
        data: { name, slug, description, status: values.status },
        include: withProductCount,
      })
    })
    return collectionToTaxonomyRow(updated)
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not update collection.')
  }
}

export async function deleteCollectionEntry(id: string): Promise<{ ok: true }> {
  await requireAdminSession()

  try {
    await prisma.$transaction(async (tx: Tx) => {
      const existing = await tx.collection.findUnique({ where: { id }, include: withProductCount })
      if (!existing) throw new Error('Collection not found.')
      if (existing._count.products > 0) throw new TaxonomyDeleteBlockedError(existing._count.products)

      await tx.collection.delete({ where: { id } })
    })
  } catch (err) {
    rethrowAsUserFacingError(err, 'Could not delete collection.')
  }
  return { ok: true }
}
