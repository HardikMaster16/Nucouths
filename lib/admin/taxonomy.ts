// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Category/Collection Service
//
// The single place the /admin/categories UI talks to. Real persistence lives
// in lib/admin/taxonomy.actions.ts (Prisma, server-side) — Category and
// Collection are now first-class tables with a real foreign key from
// Product (categoryId/collectionId; see prisma/schema.prisma and
// lib/admin/products.actions.ts), not derived facets of Product.category /
// Product.collection the way they were before that table existed:
//
//   Admin UI → this service → lib/admin/taxonomy.actions.ts
//                              (Prisma 'use server' actions) → PostgreSQL
//
// Types + format-only validation live in lib/admin/taxonomy-form.ts and are
// re-exported below (so existing imports of this file keep working) — see
// that file for why TaxonomyValidationError/TaxonomyDeleteBlockedError live
// there rather than here: lib/admin/taxonomy.actions.ts needs to throw the
// exact same class this file's callers catch with `instanceof`.
//
// Prisma is the single source of truth for the /admin/categories UI — there
// is no localStorage merge/hide layer any more. The seed-catalog helpers
// below the "seed slug pre-check" heading are kept only because
// validateTaxonomyForm's instant, best-effort client-side slug check still
// reads them for live-typing feedback in the form (see its own docstring).
// ─────────────────────────────────────────────────────────────────────────────

import { products } from '@/lib/mock-data'
import { COLLECTIONS } from '@/lib/collections'
import { categoryLabel, formatUpdatedAt } from './products'
import {
  createCategoryEntry,
  createCollectionEntry,
  deleteCategoryEntry,
  deleteCollectionEntry,
  updateCategoryEntry,
  updateCollectionEntry,
} from './taxonomy.actions'
import { hasTaxonomyFormErrors, TaxonomyValidationError } from './taxonomy-form'
import { ADMIN_CATEGORY_UPDATED_AT, ADMIN_COLLECTION_UPDATED_AT } from './mock-data'
import type { TaxonomyFormErrors, TaxonomyFormValues, TaxonomyKind, TaxonomyRow } from './taxonomy-form'

export * from './taxonomy-form'

// ─── Create / update / delete (real database, via Server Actions) ─────────

export async function createTaxonomyEntry(kind: TaxonomyKind, values: TaxonomyFormValues): Promise<TaxonomyRow> {
  const errors = validateTaxonomyForm(kind, values)
  if (hasTaxonomyFormErrors(errors)) throw new TaxonomyValidationError(errors)

  return kind === 'category' ? createCategoryEntry(values) : createCollectionEntry(values)
}

export async function updateTaxonomyEntry(kind: TaxonomyKind, row: TaxonomyRow, values: TaxonomyFormValues): Promise<TaxonomyRow> {
  const errors = validateTaxonomyForm(kind, values, row.id)
  if (hasTaxonomyFormErrors(errors)) throw new TaxonomyValidationError(errors)

  return kind === 'category' ? updateCategoryEntry(row.id, values) : updateCollectionEntry(row.id, values)
}

/** Throws TaxonomyDeleteBlockedError if products are still assigned — the UI
 *  should disable the action ahead of time using row.productCount, but the
 *  Prisma action (lib/admin/taxonomy.actions.ts) enforces it regardless,
 *  inside the same transaction as the delete. */
export async function deleteTaxonomyEntry(kind: TaxonomyKind, row: TaxonomyRow): Promise<void> {
  if (kind === 'category') await deleteCategoryEntry(row.id)
  else await deleteCollectionEntry(row.id)
}

// ─── Seed slug pre-check (unused by the flow above; see docstring) ─────────

function countProducts(kind: TaxonomyKind, matchKey: string): number {
  return kind === 'category'
    ? products.filter((p) => p.category === matchKey).length
    : products.filter((p) => p.collection === matchKey).length
}

export function getSeedCategoryRows(): TaxonomyRow[] {
  const seen = new Set<string>()
  const rows: TaxonomyRow[] = []
  for (const p of products) {
    if (seen.has(p.category)) continue
    seen.add(p.category)
    const updatedAt = ADMIN_CATEGORY_UPDATED_AT[p.category] ?? new Date(0).toISOString()
    rows.push({
      id: p.category,
      matchKey: p.category,
      name: categoryLabel(p.category),
      slug: p.category,
      status: 'Active',
      productCount: countProducts('category', p.category),
      updatedAt,
      updatedAtFormatted: formatUpdatedAt(updatedAt),
    })
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export function getSeedCollectionRows(): TaxonomyRow[] {
  return COLLECTIONS.filter((c) => c.criteria.type === 'collection')
    .map((c): TaxonomyRow => {
      const matchKey = c.criteria.type === 'collection' ? c.criteria.collection : ''
      const updatedAt = ADMIN_COLLECTION_UPDATED_AT[c.slug] ?? new Date(0).toISOString()
      return {
        id: c.slug,
        matchKey,
        name: c.name,
        slug: c.slug,
        description: c.description,
        status: 'Active',
        productCount: countProducts('collection', matchKey),
        updatedAt,
        updatedAtFormatted: formatUpdatedAt(updatedAt),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function seedRowsFor(kind: TaxonomyKind): TaxonomyRow[] {
  return kind === 'category' ? getSeedCategoryRows() : getSeedCollectionRows()
}

function isSeedSlugTaken(kind: TaxonomyKind, slug: string, excludeId?: string): boolean {
  return seedRowsFor(kind).some((r) => r.slug === slug && r.id !== excludeId)
}

export function isTaxonomySlugTaken(kind: TaxonomyKind, slug: string, excludeId?: string): boolean {
  return isSeedSlugTaken(kind, slug, excludeId)
}

/** Instant, best-effort client-side check against the seed catalog — used by
 *  TaxonomyFormModal's live-typing validation only. The authoritative
 *  uniqueness check happens server-side, against the real database, inside
 *  lib/admin/taxonomy.actions.ts. `excludeId` is the entry currently being
 *  edited (if any), so its own slug is never reported as a duplicate of
 *  itself. */
export function validateTaxonomyForm(
  kind: TaxonomyKind,
  values: TaxonomyFormValues,
  excludeId?: string
): TaxonomyFormErrors {
  const errors: TaxonomyFormErrors = {}
  if (!values.name.trim()) errors.name = 'Name is required.'

  const slug = values.slug.trim()
  if (!slug) errors.slug = 'Slug is required.'
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use lowercase letters, numbers, and hyphens only.'
  else if (isTaxonomySlugTaken(kind, slug, excludeId)) errors.slug = 'This slug is already in use — choose another.'

  return errors
}
