'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Cart State
//
// Client-only cart backed by localStorage (no backend yet, matches the rest of
// the data layer). Exposed via React Context so the header badge, the PDP's
// Add to Bag button, and the /cart page all share one source of truth.
// Swap the persistence in addItem/removeItem/updateQuantity for API calls when
// a backend is ready — the CartContext shape can stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { CartItem } from './types'

const CART_STORAGE_KEY = 'nucouths-cart'

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
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  /** False until the persisted cart has been read from localStorage. Gate any
   *  "cart is empty" UI on this so a returning shopper's items don't flash
   *  as an empty cart before they load. */
  isHydrated: boolean
  addItem: (input: AddToCartInput) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  /** Empties the cart — used once an order has been placed at checkout. */
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Read persisted cart after mount only — localStorage isn't available
  // during SSR, and starting from [] on both sides avoids a hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // corrupt or inaccessible storage — start with an empty cart
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage unavailable (private mode, quota) — cart still works in-memory
    }
  }, [items, hydrated])

  const addItem = useCallback((input: AddToCartInput) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.variantId === input.variantId)
      if (existing) {
        return prev.map((it) =>
          it.variantId === input.variantId
            ? { ...it, quantity: it.quantity + input.quantity }
            : it
        )
      }
      return [...prev, { ...input }]
    })
  }, [])

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((it) => it.variantId !== variantId))
  }, [])

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.variantId === variantId ? { ...it, quantity: Math.max(1, quantity) } : it
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items])

  const value = useMemo<CartContextValue>(
    () => ({ items, itemCount, isHydrated: hydrated, addItem, removeItem, updateQuantity, clearCart }),
    [items, itemCount, hydrated, addItem, removeItem, updateQuantity, clearCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
