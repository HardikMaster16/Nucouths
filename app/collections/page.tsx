import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { COLLECTIONS } from '@/lib/collections'
import { computeFilteredProducts } from '@/lib/product-filters'
import { getCatalogProducts } from '@/lib/products.db'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Collections index
//
// Purely typographic — no hero imagery, since no collection-specific images
// exist in the current data and inventing stock photos was explicitly ruled
// out. Counts come from the real Prisma catalog (lib/products.db.ts's
// getCatalogProducts, the same query /products and /collections/[slug]
// use), fetched once and reused for every collection's count via the pure
// computeFilteredProducts — never a separate database round-trip per
// collection.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Collections — Nucouths',
  description: 'Browse NUCOUTHS collections — considered edits built around season, occasion, and everyday wear.',
}

// Read live from Prisma on every request — same convention as
// app/products/page.tsx: catalog changes must show up immediately.
export const dynamic = 'force-dynamic'

export default async function CollectionsPage() {
  const catalog = await getCatalogProducts()

  const items = COLLECTIONS.map((collection) => {
    const total = computeFilteredProducts(
      catalog,
      collection.criteria.type === 'badge'
        ? { badgeIn: collection.criteria.badges.join(',') }
        : { collection: collection.criteria.collection }
    ).total
    return { ...collection, total }
  })

  return (
    <main id="main-content" className="pb-16 lg:pb-20">
      <Container className="pt-5 sm:pt-7">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-sans text-text-secondary">
            <li>
              <Link href="/" className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-border select-none">›</li>
            <li aria-current="page" className="text-text-primary font-medium">
              Collections
            </li>
          </ol>
        </nav>

        <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight mb-2">
          Collections
        </h1>
        <p className="text-sm font-sans text-text-secondary max-w-xl">
          Considered edits from the NUCOUTHS catalogue, built around season and occasion.
        </p>
      </Container>

      <Container className="pt-10 sm:pt-14">
        <p className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase text-text-secondary mb-5">
          Featured Collections
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map((collection) => (
            <Link
              key={collection.slug}
              href={`/collections/${collection.slug}`}
              className="group border border-border p-7 sm:p-8 flex flex-col gap-3 hover:border-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
                {collection.name}
              </h2>
              <p className="text-sm font-sans text-text-secondary flex-1">
                {collection.description}
              </p>
              <p className="text-xs font-sans text-text-secondary">
                {collection.total} {collection.total === 1 ? 'product' : 'products'}
              </p>
              <span className="text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 group-hover:no-underline">
                Shop the Edit →
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  )
}
