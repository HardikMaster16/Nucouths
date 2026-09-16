'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Wishlist Page (client)
//
// Reads the shared WishlistContext (lib/wishlist-context.tsx), which stores
// only product ids, and resolves them against the existing product catalog
// (lib/mock-data.ts) — the same data source /products uses. No separate
// wishlist dataset.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useRouter } from 'next/navigation'
import { useWishlist } from '@/lib/wishlist-context'
import { products } from '@/lib/mock-data'
import { ProductGrid } from '@/components/products/ProductGrid'
import { Button } from '@/components/ui/Button'
import type { Product } from '@/lib/types'

function HeartOutlineIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyWishlist() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 sm:py-28">
      <div className="text-text-secondary/30 mb-6" aria-hidden="true">
        <HeartOutlineIcon />
      </div>
      <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight mb-3">
        Your wishlist is empty
      </h1>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        Save your favourite pieces here and come back when you&apos;re ready.
      </p>
      <div className="w-full max-w-xs">
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/products')}>
          Shop Now
        </Button>
      </div>
    </div>
  )
}

// ─── WishlistClient ───────────────────────────────────────────────────────────

export function WishlistClient() {
  const { productIds, isHydrated } = useWishlist()

  // Avoid briefly rendering "Your wishlist is empty" before the persisted
  // wishlist has finished loading from localStorage.
  if (!isHydrated) return null

  if (productIds.length === 0) {
    return <EmptyWishlist />
  }

  // Resolve saved ids against the live catalog — preserves save order and
  // silently drops any id that no longer matches a real product.
  const productMap = new Map(products.map((p) => [p.id, p]))
  const wishlistedProducts = productIds
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p))

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-8 sm:mb-10 border-b border-border pb-5 sm:pb-6">
        <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight">
          Wishlist
        </h1>
        <p className="text-sm font-sans text-text-secondary shrink-0 pb-0.5">
          <span className="font-medium text-text-primary">{wishlistedProducts.length}</span>{' '}
          {wishlistedProducts.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <ProductGrid products={wishlistedProducts} columns={4} priorityCount={4} />
    </div>
  )
}
