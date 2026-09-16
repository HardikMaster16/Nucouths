import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { ProductClient } from '@/components/product/ProductClient'
import { getProductDetail, getAllProductSlugs } from '@/lib/product-detail-data'

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = getProductDetail(slug)
  if (!product) return { title: 'Product Not Found — Nucouths' }

  return {
    title: `${product.name} — Nucouths`,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} — Nucouths`,
      description: product.shortDescription,
      images: [{ url: product.images[0].src, alt: product.images[0].alt }],
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const product = getProductDetail(slug)
  if (!product) notFound()

  // Breadcrumb second level — prefer collection, fall back to category label
  const collectionLabel = product.collection ?? `${product.category.charAt(0).toUpperCase()}${product.category.slice(1)}`
  const collectionHref = product.collection
    ? `/products?category=${product.category}`
    : `/products?category=${product.category}`

  return (
    <main id="main-content" className="pb-24 lg:pb-12">
      <Container className="pt-5 sm:pt-7">

        {/* ── Breadcrumb ──────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-sans text-text-secondary">
            <li>
              <a
                href="/"
                className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded"
              >
                Home
              </a>
            </li>
            <li aria-hidden="true" className="text-border select-none">›</li>
            <li>
              <a
                href={collectionHref}
                className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded"
              >
                {collectionLabel}
              </a>
            </li>
            <li aria-hidden="true" className="text-border select-none">›</li>
            <li
              aria-current="page"
              className="text-text-primary font-medium truncate max-w-[200px] sm:max-w-none"
            >
              {product.name}
            </li>
          </ol>
        </nav>

        {/* ── All interactive content (gallery + info + related) ── */}
        <ProductClient product={product} />

      </Container>
    </main>
  )
}
