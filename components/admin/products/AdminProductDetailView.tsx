import React from 'react'
import Link from 'next/link'
import { variantStockState } from '@/lib/product-detail-data'
import { formatPrice } from '@/lib/cart-pricing'
import { categoryLabel } from '@/lib/admin/products'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductStatusBadge } from '@/components/admin/products/ProductStatusBadge'
import { ProductStockBadge } from '@/components/admin/products/ProductStockBadge'
import type { AdminProductRow } from '@/lib/admin/products'
import type { ProductDetail } from '@/lib/types'

const VARIANT_STOCK_CLASSES: Record<string, string> = {
  'in-stock': 'text-[#2F7A4D]',
  'low-stock': 'text-[#B45309]',
  'sold-out': 'text-sale',
  'out-of-stock': 'text-sale',
}

interface AdminProductDetailViewProps {
  product: AdminProductRow
  detail: ProductDetail | undefined
}

const backLinkClasses =
  'text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded'

const secondaryButtonClasses =
  'inline-flex items-center h-11 px-5 text-sm font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary'

const primaryButtonClasses =
  'inline-flex items-center h-11 px-6 text-sm font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 shrink-0'

/** Pure presentational — renders the Prisma-backed product row/detail
 *  resolved by app/admin/(dashboard)/products/[id]/page.tsx.
 *
 *  `detail` carries everything the AdminProductRow summary doesn't
 *  (description, collection, product type, compare-at price, the full image
 *  set, variants) — it's only missing in the rare case a seed catalog id has
 *  no matching lib/product-detail-data.ts entry, which the JSX below
 *  degrades gracefully for rather than crashing. */
export function AdminProductDetailView({ product, detail }: AdminProductDetailViewProps) {
  const images = detail?.images ?? [product.image]
  const price = detail?.price ?? product.price
  const currency = detail?.currency ?? product.currency
  const compareAtPrice = detail?.compareAtPrice
  const discount = compareAtPrice ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : null
  const variants = detail?.variants ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs font-sans text-text-secondary flex-wrap">
          <li>
            <Link href="/admin" className="hover:text-text-primary transition-colors duration-150">
              Admin
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">›</li>
          <li>
            <Link href="/admin/products" className="hover:text-text-primary transition-colors duration-150">
              Products
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">›</li>
          <li aria-current="page" className="text-text-primary font-medium truncate max-w-[220px]">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/products" className={backLinkClasses}>
            ← Back to Products
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mt-2">
            Product Details
          </h1>
          <p className="text-sm font-sans text-text-secondary mt-1">
            {product.name} · {product.sku}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin/products" className={secondaryButtonClasses}>
            Back to Products
          </Link>
          <Link href={`/admin/products/${product.id}/edit`} className={primaryButtonClasses}>
            Edit Product
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <div className="relative aspect-[3/4] w-full bg-surface rounded-sm overflow-hidden border border-border">
          <ImageWithFallback image={images[0]} fill sizes="280px" />
        </div>

        <div className="flex flex-col gap-6">
          {/* Product Overview */}
          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Product Overview</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-sm font-sans">
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">SKU</dt>
                <dd className="text-text-primary font-mono text-[13px]">{product.sku}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Category</dt>
                <dd className="text-text-primary">{product.categoryLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Collection</dt>
                <dd className="text-text-primary">{detail?.collection || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Product Type</dt>
                <dd className="text-text-primary">{detail?.subcategory ? categoryLabel(detail.subcategory) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Status</dt>
                <dd><ProductStatusBadge status={product.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1">Last Updated</dt>
                <dd className="text-text-primary">{product.updatedAtFormatted}</dd>
              </div>
            </dl>

            {detail?.description && (
              <div className="mt-5 pt-5 border-t border-border">
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-1.5">Description</dt>
                <dd className="text-sm font-sans text-text-primary leading-relaxed">{detail.description}</dd>
              </div>
            )}
          </section>

          {/* Pricing */}
          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Pricing</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={['text-2xl font-sans font-semibold leading-none', compareAtPrice ? 'text-sale' : 'text-text-primary'].join(' ')}>
                {formatPrice(price, currency)}
              </span>
              {compareAtPrice && (
                <>
                  <span className="text-sm font-sans text-text-secondary line-through">
                    {formatPrice(compareAtPrice, currency)}
                  </span>
                  <span className="text-xs font-sans font-bold text-sale bg-sale/10 px-1.5 py-0.5 rounded-sm">
                    -{discount}%
                  </span>
                </>
              )}
            </div>
            {compareAtPrice && (
              <p className="text-xs font-sans text-text-secondary mt-2">
                Discounted from {formatPrice(compareAtPrice, currency)} — customers save{' '}
                {formatPrice(compareAtPrice - price, currency)}.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Images */}
      <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-sm font-sans font-semibold text-text-primary">Images</h2>
          <span className="text-xs font-sans text-text-secondary">{images.length} image{images.length === 1 ? '' : 's'}</span>
        </div>
        <p className="text-xs font-sans text-text-secondary mb-4">
          The first image is the primary/cover image. Select a thumbnail to preview it.
        </p>
        <div className="group max-w-sm">
          <ProductGallery images={images} productName={product.name} showPrimaryBadge />
        </div>
      </section>

      {/* Variants */}
      <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-sans font-semibold text-text-primary">Variants</h2>
          <span className="text-xs font-sans text-text-secondary">{variants.length} row{variants.length === 1 ? '' : 's'}</span>
        </div>

        {variants.length === 0 ? (
          <p className="text-sm font-sans text-text-secondary">This product has no variants on record.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">SKU</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Color</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Size</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Stock</th>
                    <th scope="col" className="py-2 pl-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Price Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {variants.map((variant) => {
                    const state = variantStockState(variant.stock)
                    return (
                      <tr key={variant.id}>
                        <td className="py-2.5 pr-4 text-text-secondary font-mono text-[12px]">{variant.sku}</td>
                        <td className="py-2.5 pr-4 text-text-primary">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-border/80 shrink-0"
                              style={{ backgroundColor: variant.colorHex }}
                              aria-hidden="true"
                            />
                            {variant.color}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-text-primary">{variant.size}</td>
                        <td className={`py-2.5 pr-4 text-right font-medium ${VARIANT_STOCK_CLASSES[state]}`}>
                          {variant.stock}
                        </td>
                        <td className="py-2.5 pl-4 text-right text-text-primary">
                          {variant.priceOverride !== undefined ? formatPrice(variant.priceOverride, currency) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile — stacked cards, not a squeezed table */}
            <ul className="md:hidden divide-y divide-border -mx-5 sm:-mx-6">
              {variants.map((variant) => {
                const state = variantStockState(variant.stock)
                return (
                  <li key={variant.id} className="px-5 sm:px-6 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-sans font-medium text-text-primary">
                        <span
                          className="w-3 h-3 rounded-full border border-border/80 shrink-0"
                          style={{ backgroundColor: variant.colorHex }}
                          aria-hidden="true"
                        />
                        {variant.color} · {variant.size}
                      </span>
                      <span className={`text-sm font-sans font-medium ${VARIANT_STOCK_CLASSES[state]}`}>
                        {variant.stock} in stock
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs font-sans text-text-secondary">
                      <span className="font-mono">{variant.sku}</span>
                      <span>
                        {variant.priceOverride !== undefined
                          ? `Override: ${formatPrice(variant.priceOverride, currency)}`
                          : 'No price override'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {/* Inventory Summary */}
      <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
        <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Inventory Summary</h2>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Total Stock</p>
            <p className="text-2xl font-sans font-semibold text-text-primary leading-none">{product.totalStock}</p>
          </div>
          <div>
            <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Variants</p>
            <p className="text-2xl font-sans font-semibold text-text-primary leading-none">{product.variantCount}</p>
          </div>
          <div>
            <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Inventory Status</p>
            <ProductStockBadge totalStock={product.totalStock} stockState={product.stockState} />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-2">
        <Link href="/admin/products" className={secondaryButtonClasses}>
          Back to Products
        </Link>
        <Link href={`/admin/products/${product.id}/edit`} className={primaryButtonClasses}>
          Edit Product
        </Link>
      </div>
    </div>
  )
}
