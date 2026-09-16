'use client'

import React from 'react'
import { ProductCard } from '@/components/products/ProductCard'
import type { ProductDetail, Product } from '@/lib/types'

interface RelatedProductsProps {
  products: ProductDetail[]
  title?: string
}

export function RelatedProducts({ products, title = 'You May Also Like' }: RelatedProductsProps) {
  if (products.length === 0) return null

  return (
    <section aria-label={title} className="pt-10 pb-4 border-t border-border">
      <div className="mb-6 sm:mb-8 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl sm:text-3xl text-text-primary">{title}</h2>
        <a
          href="/products"
          className="text-[11px] font-sans text-text-secondary tracking-wide underline underline-offset-2 hover:text-text-primary transition-colors duration-150 shrink-0 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          View All
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product as Product}
            priority={i === 0}
          />
        ))}
      </div>
    </section>
  )
}
