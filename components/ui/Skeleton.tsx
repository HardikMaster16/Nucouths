import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Shared skeleton primitives
//
// A skeleton's job is to reserve the same space the real content will take,
// so nothing shifts once it arrives. Compose `Skeleton` blocks to match a
// layout rather than inventing a new placeholder shape per page. Animation is
// the existing `animate-pulse` Tailwind utility — reduced-motion handling
// lives once, globally, in app/globals.css.
// ─────────────────────────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface rounded-sm ${className}`} />
}

// ─── Product card / grid ────────────────────────────────────────────────────
//
// Mirrors components/products/ProductCard.tsx's shape (aspect-[3/4] image,
// name line, price line) so a loading grid reserves the same footprint as
// the real one and nothing jumps once products arrive.

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

const gridColClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

export function ProductGridSkeleton({
  columns = 4,
  count = 8,
  className = '',
}: {
  columns?: 2 | 3 | 4
  count?: number
  className?: string
}) {
  return (
    <div
      className={['grid gap-x-4 gap-y-8 sm:gap-x-6', gridColClasses[columns], className]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Product listing page (/products, /search, /collections/[slug]) ───────
//
// All three routes share the same header shape (breadcrumb + title + count)
// and the same ProductsShell (filter sidebar + sort bar + grid) — one
// skeleton for the shell covers all three loading.tsx files.

export function ProductListingHeaderSkeleton({
  withSearchField = false,
  withDescription = false,
}: {
  /** Search's header additionally has a search input below the title. */
  withSearchField?: boolean
  /** Collection pages additionally have a description line below the title. */
  withDescription?: boolean
}) {
  return (
    <div className="border-b border-border bg-white" aria-hidden="true">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-container py-5 sm:py-7">
        <Skeleton className="h-3 w-40 mb-4" />
        <div className="flex items-end justify-between gap-4">
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
        {withDescription && <Skeleton className="h-3 w-2/3 max-w-md mt-3" />}
        {withSearchField && <Skeleton className="h-11 w-full max-w-md mt-5" />}
      </div>
    </div>
  )
}

function FilterSidebarSkeleton() {
  return (
    <aside className="hidden lg:block shrink-0 w-56 xl:w-64" aria-hidden="true">
      <Skeleton className="h-3 w-16 mb-4" />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-full max-w-[140px]" />
            <Skeleton className="h-3 w-full max-w-[110px]" />
            <Skeleton className="h-3 w-full max-w-[130px]" />
          </div>
        ))}
      </div>
    </aside>
  )
}

export function ProductListingSkeleton({
  columns = 4,
  withSearchField = false,
  withDescription = false,
}: {
  columns?: 2 | 3 | 4
  withSearchField?: boolean
  withDescription?: boolean
}) {
  return (
    <>
      <ProductListingHeaderSkeleton withSearchField={withSearchField} withDescription={withDescription} />
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-container py-6 sm:py-8">
        <div className="flex gap-8 lg:gap-10 items-start">
          <FilterSidebarSkeleton />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6" aria-hidden="true">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24 lg:hidden" />
            </div>
            <ProductGridSkeleton columns={columns} count={columns * 2} />
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Product detail (/products/[slug]) ─────────────────────────────────────
//
// Mirrors components/product/ProductClient.tsx's grid-cols-1 lg:grid-cols-[1fr_420px]
// gallery + info layout.

export function ProductDetailSkeleton() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_440px] gap-8 lg:gap-12 xl:gap-16 items-start"
      aria-hidden="true"
    >
      {/* Gallery */}
      <div className="flex flex-col gap-3">
        <Skeleton className="aspect-[3/4] w-full" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-28" />
        <div className="flex flex-col gap-2 pt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full" />
        <div className="flex flex-col gap-2 pt-4 border-t border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
