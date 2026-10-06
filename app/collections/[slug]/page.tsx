import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { ProductsShell } from '@/components/products/ProductsShell'
import { getFilteredProductsFromDb } from '@/lib/products.db'
import { COLLECTIONS, getCollectionBySlug } from '@/lib/collections'
import type { SortOption } from '@/lib/product-filters'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Collection listing (/collections/[slug])
//
// Reuses the exact same getFilteredProductsFromDb pipeline (Prisma-backed,
// lib/products.db.ts) and ProductsShell (filters, sort, grid, pagination,
// empty state) /products and /search use — the collection just supplies a
// fixed query/filter constraint (see lib/collections.ts) on top of it. For
// a badge-type collection (New In, Sale) the Availability/badge facet is
// hidden — that axis is exactly what already selected this collection, so
// surfacing it again as an independent control would look interactive
// without doing anything.
// ─────────────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Read live from Prisma on every request — same convention as
// app/products/page.tsx: catalog changes must show up immediately, not
// just after the next build. generateStaticParams below only enumerates
// the fixed, non-product collection slugs (lib/collections.ts) — it isn't
// prerendering product data.
export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const collection = getCollectionBySlug(slug)
  if (!collection) return {}

  return {
    title: `${collection.name} — Nucouths`,
    description: collection.description,
  }
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const collection = getCollectionBySlug(slug)
  if (!collection) notFound()

  const sp = await searchParams
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const num = (k: string) => {
    const v = str(k)
    if (!v) return undefined
    const n = parseInt(v, 10)
    return isNaN(n) ? undefined : n
  }

  const category    = str('category')
  const subcategory = str('subcategory')
  const sort        = str('sort') as SortOption | undefined
  const size        = str('size')
  const color       = str('color')
  const minPrice    = num('minPrice')
  const maxPrice    = num('maxPrice')
  // Only meaningful for "named" collections — a badge-type collection's own
  // criteria already fixes this axis (see below).
  const urlBadge    = str('badge')

  const criteriaParams =
    collection.criteria.type === 'badge'
      ? { badgeIn: collection.criteria.badges.join(',') }
      : { collection: collection.criteria.collection, badge: urlBadge }

  const result = await getFilteredProductsFromDb({
    ...criteriaParams, category, subcategory, sort, size, color, minPrice, maxPrice,
  })

  const activeFilters = {
    category, subcategory, sort, size, color, minPrice, maxPrice,
    badge: collection.criteria.type === 'badge' ? undefined : urlBadge,
  }

  // Hide the Availability facet on badge-type collections — its checkboxes
  // would update the URL but this page ignores that param for them, which
  // would look broken rather than simply absent.
  const shellResult =
    collection.criteria.type === 'badge'
      ? { ...result, facets: { ...result.facets, badges: [] } }
      : result

  return (
    <main id="main-content">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="border-b border-border bg-white">
        <Container className="py-5 sm:py-7">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-2.5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-sans text-text-secondary">
              <li>
                <Link href="/" className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-border select-none">›</li>
              <li>
                <Link href="/collections" className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded">
                  Collections
                </Link>
              </li>
              <li aria-hidden="true" className="text-border select-none">›</li>
              <li aria-current="page" className="text-text-primary font-medium">
                {collection.name}
              </li>
            </ol>
          </nav>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight">
              {collection.name}
            </h1>
            <p className="text-sm font-sans text-text-secondary shrink-0 pb-0.5">
              <span className="font-medium text-text-primary">{result.total}</span>
              {' '}{result.total === 1 ? 'product' : 'products'}
            </p>
          </div>

          <p className="mt-1 text-sm font-sans text-text-secondary">
            {collection.description}
          </p>
        </Container>
      </div>

      {/* ── Filters + sort + grid (client — same shell /products/​/search use) ── */}
      <ProductsShell result={shellResult} activeFilters={activeFilters} />
    </main>
  )
}
