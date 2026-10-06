import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { ProductsShell } from '@/components/products/ProductsShell'
import { SearchForm } from '@/components/search/SearchForm'
import { SearchEmptyState } from '@/components/search/SearchEmptyState'
import { PopularSearches } from '@/components/search/PopularSearches'
import { normalizeSearchQuery } from '@/lib/product-filters'
import { getFilteredProductsFromDb } from '@/lib/products.db'
import type { SortOption } from '@/lib/product-filters'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Search
//
// Reuses the exact same filtering pipeline /products uses
// (getFilteredProductsFromDb in lib/products.db.ts, Prisma-backed, now
// extended with a `query` param) rather than a second search
// implementation, and the exact same ProductsShell (filters, sort, grid,
// pagination) for the results themselves — only the page header and the
// empty state are search-specific. The URL (?q=, plus any of the same
// filter/sort params /products supports) is the single source of truth;
// this page renders whatever it decodes from searchParams and nothing is
// held only in component state.
// ─────────────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Read live from Prisma on every request — same convention as
// app/products/page.tsx: catalog changes must show up immediately.
export const dynamic = 'force-dynamic'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const raw = typeof params.q === 'string' ? params.q : undefined
  const query = raw ? normalizeSearchQuery(raw) : ''

  return {
    title: query ? `Search results for "${query}" — Nucouths` : 'Search — Nucouths',
    description: query
      ? `Products matching "${query}" at Nucouths.`
      : 'Search the full Nucouths catalogue for products, styles, and collections.',
    // Search-results pages are per-query noise for crawlers, not content worth indexing.
    robots: { index: false, follow: true },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Safely extract all params from the URL (mirrors app/products/page.tsx).
  const str = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : undefined)
  const num = (k: string) => {
    const v = str(k)
    if (!v) return undefined
    const n = parseInt(v, 10)
    return isNaN(n) ? undefined : n
  }

  // A missing, empty, or whitespace-only ?q= is all treated as "no query" —
  // never rendered as a literal "" search.
  const rawQuery = str('q')
  const query = rawQuery ? normalizeSearchQuery(rawQuery) : ''
  const hasQuery = query.length > 0

  const category    = str('category')
  const subcategory = str('subcategory')
  const sort        = str('sort') as SortOption | undefined
  const badge       = str('badge')
  const size        = str('size')
  const color       = str('color')
  const minPrice    = num('minPrice')
  const maxPrice    = num('maxPrice')

  const result = await getFilteredProductsFromDb({
    query: hasQuery ? query : undefined,
    category, subcategory, sort, badge, size, color, minPrice, maxPrice,
  })

  const activeFilters = { category, subcategory, sort, badge, size, color, minPrice, maxPrice }

  // Real, data-derived suggestions for the empty-query landing state — the
  // two top-level categories plus whatever subcategories actually exist in
  // the catalogue (never a hardcoded list that could drift from real data).
  const popularSearches = hasQuery
    ? []
    : ['Men', 'Women', ...result.facets.subcategories.slice(0, 4).map((s) => s.label)]

  return (
    <main id="main-content">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="border-b border-border bg-white">
        <Container className="py-5 sm:py-7">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-2.5">
            <ol className="flex items-center gap-1.5 text-[11px] font-sans text-text-secondary">
              <li>
                <Link href="/" className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-border select-none">›</li>
              <li aria-current="page" className="text-text-primary font-medium">
                Search
              </li>
            </ol>
          </nav>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight">
              {hasQuery ? `Search results for “${query}”` : 'Search NUCOUTHS'}
            </h1>
            {hasQuery && (
              <p className="text-sm font-sans text-text-secondary shrink-0 pb-0.5">
                <span className="font-medium text-text-primary">{result.total}</span>
                {' '}{result.total === 1 ? 'product' : 'products'}
              </p>
            )}
          </div>

          {!hasQuery && (
            <p className="mt-1 text-sm font-sans text-text-secondary">
              Find pieces you&apos;ll want to wear again.
            </p>
          )}

          <div className="mt-5">
            <SearchForm defaultValue={query} />
          </div>
        </Container>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      {!hasQuery ? (
        <PopularSearches terms={popularSearches} />
      ) : (
        <ProductsShell
          result={result}
          activeFilters={activeFilters}
          emptyState={<SearchEmptyState query={query} />}
        />
      )}
    </main>
  )
}
