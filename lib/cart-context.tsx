'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Cart State
//
// Two backends, chosen automatically by sign-in state, same split as
// lib/wishlist-context.tsx:
//   - Signed out: localStorage only — unchanged from before.
//   - Signed in: the real database (lib/cart.actions.ts, Prisma-backed,
//     requireCustomerSession()-gated). `items` already carries the fully
//     resolved CartItem[] shape either way (a database-backed cart line's
//     productId/variantId are real Product/ProductVariant ids, current
//     price/image always re-read live) — unlike wishlist there's no
//     separate "ids vs resolved objects" split needed here.
//
// Either way, addItem()/removeItem()/updateQuantity()/clearCart() keep the
// exact same call signature every existing consumer (CartClient, Header,
// ProductClient, CheckoutClient, OrderDetailClient) already uses — those
// components need no changes at all. All four stay synchronous (void
// return): each applies its change to `items` immediately (optimistic),
// then — only when signed in — fires the matching Server Action in the
// background and reverts the optimistic change if it fails, the same
// pattern toggleWishlist() already established.
//
// `error` surfaces the safe, customer-facing message from the most recent
// failed mutation (a guest mutation never fails server-side, so this is
// always null for a guest). Every message it can ever hold comes from
// lib/cart.actions.ts's own safe-error contract — that file never lets a
// raw Prisma/DB error escape — so reading err.message here is never a leak.
// Cleared automatically at the start of the next mutation attempt, or via
// clearError() (e.g. a dismiss button), so it never lingers once superseded.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth-context'
import { addToCartAction, clearCartAction, listCartAction, removeFromCartAction, updateCartItemQuantityAction } from './cart.actions'
import type { CartItem } from './types'

const CART_STORAGE_KEY = 'nucouths-cart'

function safeErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export interface AddToCartInput {
  productId: string
  variantId: string
  slug: string
  name: string
  category: string
  color: string
  size: string
  quantity: number
  price: number
  compareAtPrice?: number
  currency: string
  image: CartItem['image']
  /** Stock at the moment the caller resolved this item (live Prisma read for
   *  both the PDP add-to-bag button and Buy Again) — see CartItem.stock's
   *  own docstring for why this is display-only, never authoritative. */
  stock: number
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  /** False until the persisted cart has been read (localStorage for a
   *  guest, the database for a signed-in customer). Gate any "cart is
   *  empty" UI on this so a returning shopper's items don't flash as an
   *  empty cart before they load. */
  isHydrated: boolean
  addItem: (input: AddToCartInput) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  /** Empties the cart — used once an order has been placed at checkout. */
  clearCart: () => void
  /** Safe, customer-facing message from the most recent failed cart
   *  mutation — see the module docstring above. Null when there's nothing
   *  to show. */
  error: string | null
  /** Dismisses the current error without waiting for the next mutation. */
  clearError: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isHydrated: authHydrated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])
  // Mirrors the current `user` in a ref so callbacks defined before a login/
  // logout don't close over a stale value — same reasoning as capturing
  // `user` in wishlist-context.tsx's toggleWishlist, just via a ref since
  // these callbacks aren't rebuilt on every user change (see deps below).
  const userRef = useRef(user)
  userRef.current = user

  // Guest path — read persisted cart from localStorage after mount, same as
  // before. Only runs once auth state is known and nobody's signed in
  // (re-runs on logout, restoring the guest view).
  useEffect(() => {
    if (!authHydrated || user) return
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      setItems(raw ? JSON.parse(raw) : [])
    } catch {
      setItems([])
    }
    setHydrated(true)
  }, [authHydrated, user])

  // Signed-in path — read the real cart from the database. Re-runs on login
  // (and on user id change), so switching accounts never shows a stale cart.
  useEffect(() => {
    if (!authHydrated || !user) return
    let cancelled = false

    listCartAction()
      .then((serverItems) => {
        if (!cancelled) setItems(serverItems)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [authHydrated, user])

  // Persist the guest cart to localStorage on change — unchanged behavior,
  // and never runs for a signed-in customer (whose cart lives in the
  // database instead).
  useEffect(() => {
    if (!hydrated || user) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage unavailable (private mode, quota) — cart still works in-memory
    }
  }, [items, hydrated, user])

  const addItem = useCallback((input: AddToCartInput) => {
    setError(null)
    // Optimistic update — applies immediately for both guest and signed-in
    // paths.
    setItems((prev) => {
      const existing = prev.find((it) => it.variantId === input.variantId)
      if (existing) {
        return prev.map((it) =>
          it.variantId === input.variantId ? { ...it, quantity: it.quantity + input.quantity } : it
        )
      }
      return [...prev, { ...input }]
    })

    if (!userRef.current) return // guest — the state update above is the only persistence needed

    // Signed in — reconcile with the server; replace the optimistic entry
    // with the authoritative one it returns (current price, real merged
    // quantity), or revert entirely if the add failed (e.g. the variant no
    // longer exists).
    addToCartAction(input.productId, input.variantId, input.quantity)
      .then((serverItem) => {
        setItems((prev) => prev.map((it) => (it.variantId === input.variantId ? serverItem : it)))
      })
      .catch((err) => {
        setError(safeErrorMessage(err, 'Could not add this item to your bag. Please try again.'))
        setItems((prev) => {
          const existed = prev.some((it) => it.variantId === input.variantId && it.quantity > input.quantity)
          if (existed) {
            return prev.map((it) =>
              it.variantId === input.variantId ? { ...it, quantity: it.quantity - input.quantity } : it
            )
          }
          return prev.filter((it) => it.variantId !== input.variantId)
        })
      })
  }, [])

  const removeItem = useCallback((variantId: string) => {
    setError(null)
    let removed: CartItem | undefined
    setItems((prev) => {
      removed = prev.find((it) => it.variantId === variantId)
      return prev.filter((it) => it.variantId !== variantId)
    })

    if (!userRef.current) return

    removeFromCartAction(variantId).catch((err) => {
      setError(safeErrorMessage(err, 'Could not remove this item. Please try again.'))
      if (removed) setItems((prev) => (prev.some((it) => it.variantId === variantId) ? prev : [...prev, removed as CartItem]))
    })
  }, [])

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setError(null)
    const nextQuantity = Math.max(1, quantity)
    let previousQuantity: number | undefined
    setItems((prev) =>
      prev.map((it) => {
        if (it.variantId !== variantId) return it
        previousQuantity = it.quantity
        return { ...it, quantity: nextQuantity }
      })
    )

    if (!userRef.current) return

    updateCartItemQuantityAction(variantId, nextQuantity)
      .then((serverItem) => {
        setItems((prev) => prev.map((it) => (it.variantId === variantId ? serverItem : it)))
      })
      .catch((err) => {
        setError(safeErrorMessage(err, 'Could not update the quantity. Please try again.'))
        if (previousQuantity !== undefined) {
          setItems((prev) => prev.map((it) => (it.variantId === variantId ? { ...it, quantity: previousQuantity as number } : it)))
        }
      })
  }, [])

  const clearCart = useCallback(() => {
    setError(null)
    const previousItems = items
    setItems([])

    if (!userRef.current) return

    clearCartAction().catch((err) => {
      setError(safeErrorMessage(err, 'Could not clear your cart. Please try again.'))
      setItems(previousItems)
    })
  }, [items])

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items])

  const value = useMemo<CartContextValue>(
    () => ({ items, itemCount, isHydrated: hydrated, addItem, removeItem, updateQuantity, clearCart, error, clearError }),
    [items, itemCount, hydrated, addItem, removeItem, updateQuantity, clearCart, error, clearError]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
