// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Product Service
//
// The single place the Add/Edit Product forms talk to. Draft shape,
// validation, and slug/draft-key generation live in lib/admin/product-form.ts
// (re-exported below so existing imports of this file keep working);
// persistence lives in lib/admin/products.actions.ts (Prisma, server-side):
//
//   Add/Edit Product form → this service → lib/admin/products.actions.ts
//                                            (Prisma 'use server' actions)
//                                            → PostgreSQL
//
// Prisma is the single source of truth for admin products — there is no
// localStorage fallback here any more.
// ─────────────────────────────────────────────────────────────────────────────

import { createProductInDb, updateProductInDb } from './products.actions'
import { hasFormErrors, ProductValidationError, validateProductForm } from './product-form'
import type { AdminProductRow } from './products'
import type { ProductDetail } from '@/lib/types'
import type { ProductFormValues } from './product-form'

export * from './product-form'

// ─── Create ─────────────────────────────────────────────────────────────────

/** Validates the draft, then persists it via the Prisma-backed server
 *  action (lib/admin/products.actions.ts), which re-validates and enforces
 *  slug/SKU uniqueness against the real database inside a transaction.
 *  Throws ProductValidationError on any invalid/incomplete field. */
export async function createProduct(values: ProductFormValues): Promise<AdminProductRow> {
  const errors = validateProductForm(values)
  if (hasFormErrors(errors)) throw new ProductValidationError(errors)

  return createProductInDb(values)
}

// ─── Edit ───────────────────────────────────────────────────────────────────

/** Validates, then persists via the same Prisma-backed server action used by
 *  createProduct. `original.id` is the product being edited — its other
 *  fields and `options.isLocal` are no longer read for persistence, since
 *  the database (not localStorage) is now the single source of truth for
 *  which product a given id maps to. Throws ProductValidationError on any
 *  invalid/incomplete field, same contract as createProduct. */
export async function updateProduct(
  original: ProductDetail,
  values: ProductFormValues,
  _options: { isLocal: boolean }
): Promise<AdminProductRow> {
  void _options // no longer read — the database is the single source of truth for isLocal-ness
  const errors = validateProductForm(values, original.id)
  if (hasFormErrors(errors)) throw new ProductValidationError(errors)

  return updateProductInDb(original.id, values)
}
