'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Wishlist State
//
// Mirrors lib/cart-context.tsx: client-only, localStorage-backed, exposed via
// React Context so the header badge, ProductCard, the PDP's wishlist button,
// and /wishlist all share one source of truth. Stores only product ids —
// full product data is always resolved live from the existing catalog
// (lib/mock-data.ts), never duplicated/snapshotted here.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'

const WISHLIST_STORAGE_KEY = 'nucouths-wishlist'

interface WishlistContextValue {
  productIds: string[]
  itemCount: number
  /** False until the persisted wishlist has been read from localStorage. */
  isHydrated: boolean
  isWishlisted: (productId: string) => boolean
  toggleWishlist: (productId: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Read persisted wishlist after mount only — localStorage isn't available
  // during SSR, and starting from [] on both sides avoids a hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY)
      if (raw) setProductIds(JSON.parse(raw))
    } catch {
      // corrupt or inaccessible storage — start with an empty wishlist
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds))
    } catch {
      // storage unavailable (private mode, quota) — wishlist still works in-memory
    }
  }, [productIds, hydrated])

  const toggleWishlist = useCallback((productId: string) => {
    setProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    )
  }, [])

  const isWishlisted = useCallback(
    (productId: string) => productIds.includes(productId),
    [productIds]
  )

  const itemCount = useMemo(() => productIds.length, [productIds])

  const value = useMemo<WishlistContextValue>(
    () => ({ productIds, itemCount, isHydrated: hydrated, isWishlisted, toggleWishlist }),
    [productIds, itemCount, hydrated, isWishlisted, toggleWishlist]
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider')
  return ctx
}
