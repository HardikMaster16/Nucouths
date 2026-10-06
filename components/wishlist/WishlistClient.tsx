'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Wishlist Page (client)
//
// Reads the shared WishlistContext (lib/wishlist-context.tsx), which stores
// only product ids. For a signed-in customer, the context already resolved
// full product data server-side (products !== null). For a guest, the ids
// live in localStorage and are resolved here against the real Prisma
// catalog via lib/products.actions.ts's getProductsByIdsAction — never a
// mock catalog. No separate wishlist dataset either way.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWishlist } from '@/lib/wishlist-context'
import { getProductsByIdsAction } from '@/lib/products.actions'
import { ProductGrid } from '@/components/products/ProductGrid'
import { Button } from '@/components/ui/Button'
import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton'
import type { Product } from '@/lib/types'

// ─── Skeleton ───────────────────────────────────────────────────────────────

function WishlistSkeleton() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8 sm:mb-10 border-b border-border pb-5 sm:pb-6" aria-hidden="true">
        <Skeleton className="h-8 sm:h-9 w-32" />
        <Skeleton className="h-4 w-16 shrink-0" />
      </div>
      {/* ProductGridSkeleton carries its own role="status" announcement — kept
          outside the aria-hidden header above so it isn't suppressed. */}
      <ProductGridSkeleton columns={4} count={4} />
    </div>
  )
}

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
  const { productIds, products: dbProducts, isHydrated } = useWishlist()

  // Guest path only — a signed-in customer's wishlist is already resolved
  // server-side by the context (dbProducts !== null), so this never runs
  // for them. Re-resolves whenever the guest's saved id list changes
  // (toggle/remove) against the real Prisma catalog — never a mock one.
  // Order is preserved by getProductsByIdsAction; an id that no longer
  // matches a real product (deleted since it was saved) is silently
  // dropped rather than crashing the page.
  const [guestProducts, setGuestProducts] = useState<Product[] | null>(null)

  useEffect(() => {
    if (!isHydrated || dbProducts) return

    if (productIds.length === 0) {
      setGuestProducts([])
      return
    }

    let cancelled = false
    getProductsByIdsAction(productIds)
      .then((resolved) => {
        if (!cancelled) setGuestProducts(resolved)
      })
      .catch(() => {
        if (!cancelled) setGuestProducts([])
      })
    return () => {
      cancelled = true
    }
  }, [isHydrated, dbProducts, productIds])

  // Avoid briefly rendering "Your wishlist is empty" before the persisted
  // wishlist has finished loading (localStorage for a guest, the database
  // for a signed-in customer) — or, for a guest, before the id list has
  // finished resolving against the real catalog.
  if (!isHydrated) return <WishlistSkeleton />

  const wishlistedProducts = dbProducts ?? guestProducts
  if (wishlistedProducts === null) return <WishlistSkeleton />

  if (wishlistedProducts.length === 0) {
    return <EmptyWishlist />
  }

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
