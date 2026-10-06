'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Wishlist State
//
// Two backends, chosen automatically by sign-in state:
//   - Signed out: localStorage only — unchanged from before. Stores product
//     ids; full product data is resolved live against the mock catalog by
//     components/wishlist/WishlistClient.tsx, exactly as it always has.
//   - Signed in: the real database (lib/wishlist.actions.ts, Prisma-backed,
//     requireCustomerSession()-gated). `products` below carries the fully
//     resolved Product[] for this path, since a database-backed wishlist
//     entry's productId is a real Product.id — not one of the mock
//     catalog's ids — so WishlistClient can't resolve it the old way; it
//     reads `products` directly instead when signed in (products !== null).
//
// Either way, isWishlisted()/toggleWishlist()/itemCount keep the exact same
// call signature every existing consumer (Header, ProductCard, ProductClient,
// AccountClient) already uses — those components need no changes at all.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth-context'
import { addToWishlistAction, listWishlistProductsAction, removeFromWishlistAction } from './wishlist.actions'
import type { Product } from './types'

const WISHLIST_STORAGE_KEY = 'nucouths-wishlist'

interface WishlistContextValue {
  productIds: string[]
  itemCount: number
  /** False until the persisted wishlist has been read (localStorage for a
   *  guest, the database for a signed-in customer). */
  isHydrated: boolean
  isWishlisted: (productId: string) => boolean
  toggleWishlist: (productId: string) => void
  /** Fully resolved product data for the signed-in, database-backed
   *  wishlist — null when signed out (or not yet hydrated), in which case
   *  WishlistClient falls back to resolving productIds against the mock
   *  catalog as before. */
  products: Product[] | null
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, isHydrated: authHydrated } = useAuth()
  const [productIds, setProductIds] = useState<string[]>([])
  const [products, setProducts] = useState<Product[] | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Guest path — read persisted wishlist from localStorage after mount,
  // same as before. Only runs once auth state is known and nobody's signed
  // in (re-runs on logout, restoring the guest view).
  useEffect(() => {
    if (!authHydrated || user) return
    setProducts(null)
    try {
      const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY)
      setProductIds(raw ? JSON.parse(raw) : [])
    } catch {
      setProductIds([])
    }
    setHydrated(true)
  }, [authHydrated, user])

  // Signed-in path — read the real wishlist from the database. Re-runs on
  // login (and on user id change), so switching accounts never shows a
  // stale wishlist.
  useEffect(() => {
    if (!authHydrated || !user) return
    let cancelled = false

    listWishlistProductsAction()
      .then((items) => {
        if (cancelled) return
        setProducts(items)
        setProductIds(items.map((p) => p.id))
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setProductIds([])
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [authHydrated, user])

  // Persist the guest wishlist to localStorage on change — unchanged
  // behavior, and never runs for a signed-in customer (whose wishlist lives
  // in the database instead).
  useEffect(() => {
    if (!hydrated || user) return
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds))
    } catch {
      // storage unavailable (private mode, quota) — wishlist still works in-memory
    }
  }, [productIds, hydrated, user])

  const toggleWishlist = useCallback(
    (productId: string) => {
      const wasWishlisted = productIds.includes(productId)

      // Optimistic update — applies immediately for both guest and signed-in
      // paths.
      setProductIds((prev) => (wasWishlisted ? prev.filter((id) => id !== productId) : [...prev, productId]))
      if (wasWishlisted) {
        setProducts((prev) => (prev ? prev.filter((p) => p.id !== productId) : prev))
      }

      if (!user) return // guest — the state update above is the only persistence needed

      // Signed in — reconcile with the server; revert the optimistic change
      // on failure (e.g. the product no longer exists) so the UI never
      // claims a save that didn't happen.
      const reconcile = wasWishlisted
        ? removeFromWishlistAction(productId)
        : addToWishlistAction(productId).then(() => listWishlistProductsAction().then(setProducts))

      reconcile.catch(() => {
        setProductIds((prev) => (wasWishlisted ? [...prev, productId] : prev.filter((id) => id !== productId)))
      })
    },
    [productIds, user]
  )

  const isWishlisted = useCallback((productId: string) => productIds.includes(productId), [productIds])

  const itemCount = useMemo(() => productIds.length, [productIds])

  const value = useMemo<WishlistContextValue>(
    () => ({ productIds, itemCount, isHydrated: hydrated, isWishlisted, toggleWishlist, products }),
    [productIds, itemCount, hydrated, isWishlisted, toggleWishlist, products]
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider')
  return ctx
}
