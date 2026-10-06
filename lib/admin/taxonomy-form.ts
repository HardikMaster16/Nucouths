// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Category/Collection Form (types + format-only validation)
//
// Pure, storage-agnostic logic shared by the mock/localStorage path
// (lib/admin/taxonomy.ts) and the Prisma path (lib/admin/taxonomy.actions.ts)
// — deliberately depends on neither, so importing this can never create a
// cycle between them (mirrors lib/admin/product-form.ts's role for Products).
// ─────────────────────────────────────────────────────────────────────────────

import { slugify } from './product-form'

export { slugify }

export type TaxonomyKind = 'category' | 'collection'
export type TaxonomyStatus = 'Active' | 'Inactive'

export interface TaxonomyRow {
  id: string
  /** For a DB-backed row this is informational only (Category.slug /
   *  Collection.name) — nothing reads it to resolve the Product relationship
   *  any more, since that's now a real foreign key (Product.categoryId /
   *  Product.collectionId), not a string match. Kept on the type for the
   *  mock/localStorage fallback path, where it's still load-bearing. */
  matchKey: string
  name: string
  slug: string
  description?: string
  status: TaxonomyStatus
  productCount: number
  updatedAt: string
  updatedAtFormatted: string
  /** True for a mock/localStorage-only entry (fallback path). Always
   *  undefined for a real database row. */
  isLocal?: boolean
}

export interface TaxonomyFormValues {
  name: string
  slug: string
  slugTouchedByUser: boolean
  description: string
  status: TaxonomyStatus
}

export function createInitialTaxonomyForm(): TaxonomyFormValues {
  return { name: '', slug: '', slugTouchedByUser: false, description: '', status: 'Active' }
}

export interface TaxonomyFormErrors {
  name?: string
  slug?: string
}

export function hasTaxonomyFormErrors(errors: TaxonomyFormErrors): boolean {
  return !!(errors.name || errors.slug)
}

/** Format-only checks (name present, slug shape) — no uniqueness check.
 *  "Unique against what" differs by caller: lib/admin/taxonomy.ts's
 *  validateTaxonomyForm layers a seed+localStorage check on top for instant
 *  client-side feedback; lib/admin/taxonomy.actions.ts checks the real
 *  database instead, inside a transaction, as the authoritative check. */
export function validateTaxonomyFormShape(values: TaxonomyFormValues): TaxonomyFormErrors {
  const errors: TaxonomyFormErrors = {}
  if (!values.name.trim()) errors.name = 'Name is required.'

  const slug = values.slug.trim()
  if (!slug) errors.slug = 'Slug is required.'
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use lowercase letters, numbers, and hyphens only.'

  return errors
}

export class TaxonomyValidationError extends Error {
  errors: TaxonomyFormErrors
  constructor(errors: TaxonomyFormErrors) {
    super('Taxonomy form validation failed')
    this.name = 'TaxonomyValidationError'
    this.errors = errors
  }
}

/** Thrown by delete when products are still assigned — the UI disables the
 *  delete action ahead of time using row.productCount, but the service
 *  enforces it too so nothing can bypass the guard. */
export class TaxonomyDeleteBlockedError extends Error {
  productCount: number
  constructor(productCount: number) {
    super(`Cannot delete — ${productCount} product(s) are still assigned.`)
    this.name = 'TaxonomyDeleteBlockedError'
    this.productCount = productCount
  }
}
