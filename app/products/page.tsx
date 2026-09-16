import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { ProductsShell } from '@/components/products/ProductsShell'
import { getFilteredProducts, categoryLabel } from '@/lib/product-filters'
import type { SortOption } from '@/lib/product-filters'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export function generateMetadata(): Metadata {
  return {
    title: 'All Products — Nucouths',
    description:
      'Shop the full Nucouths collection. Premium fashion for men and women — contemporary style, superior fabrics, thoughtful craftsmanship.',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Safely extract all filter params from URL
  const str = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : undefined)
  const num = (k: string) => {
    const v = str(k)
    if (!v) return undefined
    const n = parseInt(v, 10)
    return isNaN(n) ? undefined : n
  }

  const category    = str('category')
  const subcategory = str('subcategory')
  const sort        = str('sort') as SortOption | undefined
  const badge       = str('badge')
  const size        = str('size')
  const color       = str('color')
  const minPrice    = num('minPrice')
  const maxPrice    = num('maxPrice')

  // Run filter logic server-side (swap for async API call when backend is ready)
  const result = getFilteredProducts({ category, subcategory, sort, badge, size, color, minPrice, maxPrice })

  const title = categoryLabel(category, badge)

  const activeFilters = { category, subcategory, sort, badge, size, color, minPrice, maxPrice }

  return (
    <main id="main-content">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="border-b border-border bg-white">
        <Container className="py-5 sm:py-7">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-2.5">
            <ol className="flex items-center gap-1.5 text-[11px] font-sans text-text-secondary">
              <li>
                <a href="/" className="hover:text-text-primary transition-colors duration-150">
                  Home
                </a>
              </li>
              <li aria-hidden="true" className="text-border select-none">›</li>
              {category && (
                <>
                  <li>
                    <a href="/products" className="hover:text-text-primary transition-colors duration-150">
                      Products
                    </a>
                  </li>
                  <li aria-hidden="true" className="text-border select-none">›</li>
                </>
              )}
              <li aria-current="page" className="text-text-primary font-medium capitalize">
                {title}
              </li>
            </ol>
          </nav>

          {/* Title + count — always visible */}
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight">
              {title}
            </h1>
            <p className="text-sm font-sans text-text-secondary shrink-0 pb-0.5">
              <span className="font-medium text-text-primary">{result.total}</span>
              {' '}{result.total === 1 ? 'product' : 'products'}
            </p>
          </div>
        </Container>
      </div>

      {/* ── Products shell (client — filter sidebar + sort + grid) ── */}
      <ProductsShell result={result} activeFilters={activeFilters} />
    </main>
  )
}
