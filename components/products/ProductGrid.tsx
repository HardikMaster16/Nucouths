import React from 'react'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import type { Product } from '@/lib/types'

interface ProductGridProps {
  products: Product[]
  columns?: 2 | 3 | 4
  className?: string
  /** Number of priority-loaded (LCP-candidate) cards */
  priorityCount?: number
}

const colClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

export function ProductGrid({
  products,
  columns = 4,
  className = '',
  priorityCount = 4,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="grid gap-4 sm:gap-6" role="status" aria-label="Loading products">
        {[...Array(columns * 2)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={[
        'grid gap-x-4 gap-y-8 sm:gap-x-6',
        colClasses[columns],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label="Products"
    >
      {products.map((product, index) => (
        <div key={product.id} role="listitem">
          <ProductCard
            product={product}
            priority={index < priorityCount}
          />
        </div>
      ))}
    </div>
  )
}
