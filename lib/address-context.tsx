'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Saved Addresses
//
// Addresses are authenticated-only, same as before this migration — a guest
// (no signed-in user) always sees an empty list; there was never a guest
// localStorage bucket for addresses to begin with (unlike Wishlist/Cart,
// which do support a guest, local-only list). What changes here is only
// *how* a signed-in customer's addresses are stored:
//   - Before: localStorage, keyed by userId, seeded once from
//     lib/services/mock-address-service.ts.
//   - Now: the real database (lib/addresses.actions.ts, Prisma-backed,
//     requireCustomerSession()-gated). Optimistic updates apply immediately
//     and revert if the server call fails.
//
// addAddress/updateAddress/deleteAddress/setDefaultAddress keep the exact
// same synchronous call signature every existing consumer
// (components/account/AddressForm.tsx, AddressesClient.tsx) already uses —
// those components need no changes at all.
//
// The demo mock account (demo-user-001) isn't backed by a real customer
// session cookie (see lib/auth/mock-auth-service.ts) — signing in as it
// still routes through the "signed in" branch below, so its addresses now
// read as empty (the database call fails safely, since there's no real
// session for it) rather than showing the old mock seed data. This matches
// the same accepted limitation the Wishlist/Cart migrations already
// documented for the demo account.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth-context'
import {
  createAddressAction,
  deleteAddressAction,
  listAddressesAction,
  setDefaultAddressAction,
  updateAddressAction,
} from './addresses.actions'
import type { AddressInput } from './addresses.actions'
import type { Address } from './types'

export type { AddressInput }

/** Oldest-first — used both for display and to pick a deterministic
 *  replacement default (the longest-standing remaining address) for the
 *  optimistic update when the default one is deleted. The database applies
 *  the identical rule server-side (lib/addresses.actions.ts's
 *  deleteAddressAction), so the optimistic and reconciled results always
 *  agree. */
function sortByCreatedAt(list: Address[]): Address[] {
  return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

interface AddressContextValue {
  /** Default address first, then oldest to newest. */
  addresses: Address[]
  /** False until the signed-in customer's addresses have been read from the
   *  database (always true immediately for a guest, who has none). */
  isHydrated: boolean
  /** True if the database read failed. */
  loadError: boolean
  retryLoad: () => void
  addAddress: (input: AddressInput) => void
  updateAddress: (id: string, input: AddressInput) => void
  deleteAddress: (id: string) => void
  setDefaultAddress: (id: string) => void
}

const AddressContext = createContext<AddressContextValue | null>(null)

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [addresses, setAddresses] = useState<Address[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  // Guest — no addresses, same as before this migration.
  useEffect(() => {
    if (userId) return
    setAddresses([])
    setHydrated(true)
    setLoadError(false)
  }, [userId])

  // Signed in — read the real addresses from the database. Re-runs on
  // login/account switch (and on retryLoad), so switching accounts never
  // shows a stale list.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setHydrated(false)

    listAddressesAction()
      .then((items) => {
        if (cancelled) return
        setAddresses(items)
        setLoadError(false)
      })
      .catch(() => {
        if (!cancelled) {
          setAddresses([])
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [userId, retryToken])

  const retryLoad = useCallback(() => setRetryToken((t) => t + 1), [])

  // ─── Mutations — optimistic update, reconciled against the server result,
  // reverted on failure ────────────────────────────────────────────────────

  const addAddress = useCallback(
    (input: AddressInput) => {
      if (!userId) return
      const previous = addresses
      const now = new Date().toISOString()
      const shouldBeDefault = input.isDefault || addresses.length === 0
      const optimistic: Address = {
        ...input,
        id: `pending-${Date.now().toString(36)}`,
        userId,
        isDefault: shouldBeDefault,
        createdAt: now,
        updatedAt: now,
      }
      const rest = shouldBeDefault ? addresses.map((a) => ({ ...a, isDefault: false })) : addresses
      setAddresses([...rest, optimistic])

      createAddressAction(input)
        .then(() => listAddressesAction())
        .then(setAddresses)
        .catch(() => setAddresses(previous))
    },
    [addresses, userId]
  )

  const updateAddress = useCallback(
    (id: string, input: AddressInput) => {
      if (!userId) return
      const previous = addresses
      const now = new Date().toISOString()
      const optimistic = addresses.map((a) => {
        if (a.id === id) return { ...a, ...input, id, userId: a.userId, updatedAt: now }
        return input.isDefault ? { ...a, isDefault: false } : a
      })
      setAddresses(optimistic)

      updateAddressAction(id, input)
        .then(() => listAddressesAction())
        .then(setAddresses)
        .catch(() => setAddresses(previous))
    },
    [addresses, userId]
  )

  const deleteAddress = useCallback(
    (id: string) => {
      if (!userId) return
      const previous = addresses
      const target = addresses.find((a) => a.id === id)
      let remaining = addresses.filter((a) => a.id !== id)
      if (target?.isDefault && remaining.length > 0) {
        const [oldest, ...others] = sortByCreatedAt(remaining)
        remaining = [{ ...oldest, isDefault: true }, ...others]
      }
      setAddresses(remaining)

      deleteAddressAction(id)
        .then(() => listAddressesAction())
        .then(setAddresses)
        .catch(() => setAddresses(previous))
    },
    [addresses, userId]
  )

  const setDefaultAddress = useCallback(
    (id: string) => {
      if (!userId) return
      const previous = addresses
      setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })))

      setDefaultAddressAction(id)
        .then(() => listAddressesAction())
        .then(setAddresses)
        .catch(() => setAddresses(previous))
    },
    [addresses, userId]
  )

  const sortedAddresses = useMemo(() => {
    const defaultAddr = addresses.find((a) => a.isDefault)
    const rest = sortByCreatedAt(addresses.filter((a) => !a.isDefault))
    return defaultAddr ? [defaultAddr, ...rest] : rest
  }, [addresses])

  const value = useMemo<AddressContextValue>(
    () => ({
      addresses: sortedAddresses,
      isHydrated: hydrated,
      loadError,
      retryLoad,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
    }),
    [sortedAddresses, hydrated, loadError, retryLoad, addAddress, updateAddress, deleteAddress, setDefaultAddress]
  )

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
}

export function useAddresses(): AddressContextValue {
  const ctx = useContext(AddressContext)
  if (!ctx) throw new Error('useAddresses must be used within an AddressProvider')
  return ctx
}
