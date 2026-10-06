// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Category/Collection Reads (Prisma)
//
// Server-only reads backing /admin/categories. Imported only from the
// app/admin/(dashboard)/categories/page.tsx Server Component and from
// lib/admin/taxonomy.actions.ts's Server Actions — never from a 'use client'
// component, so Prisma is never pulled into a browser bundle.
//
// Unlike the mock/localStorage path (lib/admin/taxonomy.ts), there's no
// "matchKey" concept to preserve here: Product.categoryId / Product.
// collectionId are real foreign keys (see lib/admin/products.actions.ts,
// prisma/schema.prisma), so a category/collection's own slug/name can be
// freely renamed without ever desyncing a product's relationship to it.
// productCount is the live `_count.products` from that same relation.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { formatUpdatedAt } from './products'
import { requireAdminSession } from './auth/admin-session.actions'
import type { TaxonomyRow } from './taxonomy-form'
import type { Category, Collection } from '@prisma/client'

type CategoryWithCount = Category & { _count: { products: number } }
type CollectionWithCount = Collection & { _count: { products: number } }

export function categoryToTaxonomyRow(c: CategoryWithCount): TaxonomyRow {
  const updatedAt = c.updatedAt.toISOString()
  return {
    id: c.id,
    matchKey: c.slug,
    name: c.name,
    slug: c.slug,
    status: c.status,
    productCount: c._count.products,
    updatedAt,
    updatedAtFormatted: formatUpdatedAt(updatedAt),
  }
}

export function collectionToTaxonomyRow(c: CollectionWithCount): TaxonomyRow {
  const updatedAt = c.updatedAt.toISOString()
  return {
    id: c.id,
    matchKey: c.name,
    name: c.name,
    slug: c.slug,
    description: c.description ?? undefined,
    status: c.status,
    productCount: c._count.products,
    updatedAt,
    updatedAtFormatted: formatUpdatedAt(updatedAt),
  }
}

/** Requires an admin session — app/admin/(dashboard)/categories/page.tsx has
 *  no guard of its own (the client-side AdminShell redirect doesn't stop a
 *  Server Component's data fetch from running or reaching the RSC payload —
 *  see Next.js's own authentication guide), so the check happens here,
 *  right at the data source. */
export async function listAdminCategoryRows(): Promise<TaxonomyRow[]> {
  await requireAdminSession()
  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
  return rows.map(categoryToTaxonomyRow)
}

/** Requires an admin session — see listAdminCategoryRows's docstring above. */
export async function listAdminCollectionRows(): Promise<TaxonomyRow[]> {
  await requireAdminSession()
  const rows = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
  return rows.map(collectionToTaxonomyRow)
}
