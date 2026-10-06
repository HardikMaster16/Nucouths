// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Collection Registry
//
// A minimal typed model mapping the collection slugs already referenced in
// lib/mock-data.ts's navItems (the Collections dropdown + New In) onto real
// filtering criteria over the existing Product dataset. No new product data
// is invented — every slug, name, and criterion here already exists in the
// current dataset (Product.collection, Product.badge) or nav structure:
//
//   - "badge" collections (New In, Sale) — virtual groupings by the existing
//     Product.badge field, mirroring lib/mock-data.ts's own newInProducts.
//   - "named" collections (Autumn / Winter 2025, Resort Edit, Essentials) —
//     the real Product.collection values already authored per-product.
//
// Swap this array for a real collections table/API later — everything that
// reads it (app/collections/**) only needs `getCollectionBySlug`/`COLLECTIONS`
// to keep working the same way.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductBadge } from './types'

export interface Collection {
  slug: string
  name: string
  description: string
  criteria:
    | { type: 'badge'; badges: ProductBadge[] }
    | { type: 'collection'; collection: string }
}

export const COLLECTIONS: Collection[] = [
  {
    slug: 'new-in',
    name: 'New In',
    description: 'The latest additions to NUCOUTHS.',
    criteria: { type: 'badge', badges: ['NEW', 'LIMITED'] },
  },
  {
    slug: 'sale',
    name: 'Sale',
    description: 'Considered pieces, now at a reduced price.',
    criteria: { type: 'badge', badges: ['SALE'] },
  },
  {
    slug: 'aw25',
    name: 'Autumn / Winter 2025',
    description: 'Cold-weather essentials built for texture and warmth.',
    criteria: { type: 'collection', collection: 'Autumn / Winter 2025' },
  },
  {
    slug: 'resort',
    name: 'Resort Edit',
    description: 'Fluid, warm-weather pieces for wherever you’re headed next.',
    criteria: { type: 'collection', collection: 'Resort Edit' },
  },
  {
    slug: 'essentials',
    name: 'Essentials',
    description: 'Considered wardrobe staples, made to be worn often.',
    criteria: { type: 'collection', collection: 'Essentials' },
  },
]

export function getCollectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug)
}
