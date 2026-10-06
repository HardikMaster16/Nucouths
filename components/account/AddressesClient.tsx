'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Saved Addresses (client)
//
// Shares the account auth gate + sidebar with the rest of /account/*
// (useAccountAuth, AccountSidebar). Address data/mutations come from
// lib/address-context.tsx (localStorage-backed, scoped to the signed-in
// customer's email) — this component only renders it and never invents
// sample addresses. Add/Edit reuse the one AddressForm; Delete requires an
// inline confirmation (no browser confirm()).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useAddresses } from '@/lib/address-context'
import type { Address } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { AccountSidebar } from './AccountSidebar'
import { AddressForm } from './AddressForm'
import { useAccountAuth } from './useAccountAuth'

// ─── Icon ───────────────────────────────────────────────────────────────────

function MapPinOutlineIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function AddressesContentSkeleton() {
  return (
    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 animate-pulse" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-56 bg-surface rounded-sm" />
      ))}
    </div>
  )
}

function AddressesSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 animate-pulse" aria-hidden="true">
      <div className="lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 bg-surface rounded-sm" />
        ))}
      </div>
      <AddressesContentSkeleton />
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyAddresses({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 border border-border">
      <div className="text-text-secondary/30 mb-6" aria-hidden="true">
        <MapPinOutlineIcon />
      </div>
      <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-3">
        No saved addresses
      </h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        Add a delivery address to make checkout faster.
      </p>
      <div className="w-full max-w-xs px-4">
        <Button variant="primary" size="lg" fullWidth onClick={onAdd}>
          + Add New Address
        </Button>
      </div>
    </div>
  )
}

// ─── Error state ────────────────────────────────────────────────────────────

function AddressesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 border border-border">
      <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-3">
        Unable to load addresses
      </h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        We couldn&apos;t load your saved addresses right now. Please try again.
      </p>
      <div className="w-full max-w-xs px-4">
        <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  )
}

// ─── Address card ───────────────────────────────────────────────────────────

function ActionLink({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="text-xs font-sans font-medium tracking-wider uppercase underline underline-offset-4 hover:no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
    >
      {children}
    </button>
  )
}

function AddressCard({
  address,
  isPendingDelete,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onSetDefault,
}: {
  address: Address
  isPendingDelete: boolean
  onEdit: () => void
  onRequestDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onSetDefault: () => void
}) {
  return (
    <div className="border border-border p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary">
          {address.label}
        </span>
        {address.isDefault && (
          <span className="text-2xs font-sans font-semibold tracking-[0.1em] uppercase text-text-secondary border border-border px-2 py-0.5">
            Default
          </span>
        )}
      </div>

      <div className="text-sm font-sans leading-relaxed">
        <p className="text-text-primary font-medium">
          {address.firstName} {address.lastName}
        </p>
        <p className="text-text-secondary mt-1">
          {address.address}
          {address.apartment ? `, ${address.apartment}` : ''}
          <br />
          {address.city}
          <br />
          {address.state} - {address.pinCode}
          <br />
          {address.country}
        </p>
        <p className="text-text-secondary mt-2">Phone: {address.phone}</p>
      </div>

      {isPendingDelete ? (
        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-sans font-medium text-text-primary">Delete this address?</p>
            <p className="text-xs font-sans text-text-secondary mt-1">
              This address will be removed from your saved addresses.
            </p>
          </div>
          <div className="flex gap-4">
            <ActionLink onClick={onCancelDelete} className="text-text-secondary hover:text-text-primary">
              Cancel
            </ActionLink>
            <ActionLink onClick={onConfirmDelete} className="text-sale hover:text-sale">
              Delete Address
            </ActionLink>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-4">
          <div className="flex gap-4">
            <ActionLink onClick={onEdit} className="text-text-primary">
              Edit
            </ActionLink>
            <ActionLink onClick={onRequestDelete} className="text-text-secondary hover:text-text-primary">
              Delete
            </ActionLink>
          </div>
          {!address.isDefault && (
            <ActionLink onClick={onSetDefault} className="text-text-secondary hover:text-text-primary">
              Set as Default
            </ActionLink>
          )}
        </div>
      )}
    </div>
  )
}

// ─── AddressesClient ────────────────────────────────────────────────────────

type ViewMode = { type: 'list' } | { type: 'add' } | { type: 'edit'; id: string }

export function AddressesClient() {
  const { user, isHydrated: authHydrated, isLoggingOut, handleLogout } = useAccountAuth()
  const {
    addresses,
    isHydrated: addressesHydrated,
    loadError,
    retryLoad,
    deleteAddress,
    setDefaultAddress,
  } = useAddresses()

  const [view, setView] = useState<ViewMode>({ type: 'list' })
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

  if (!authHydrated) return <AddressesSkeleton />
  if (!user) return null

  const handleSaved = (message: string) => {
    setView({ type: 'list' })
    setFeedback(message)
  }

  const handleConfirmDelete = (id: string) => {
    deleteAddress(id)
    setPendingDeleteId(null)
    setFeedback('Address removed')
  }

  const handleSetDefault = (id: string) => {
    setDefaultAddress(id)
    setFeedback('Default address updated')
  }

  const editingAddress = view.type === 'edit' ? addresses.find((a) => a.id === view.id) : undefined

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-10 sm:mb-12 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight mb-1.5">
            Saved Addresses
          </h1>
          <p className="text-sm font-sans text-text-secondary">
            Manage your delivery addresses for a faster checkout experience.
          </p>
        </div>
        {view.type === 'list' && addressesHydrated && !loadError && addresses.length > 0 && (
          <Button variant="primary" size="md" onClick={() => setView({ type: 'add' })}>
            + Add New Address
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        <AccountSidebar active="addresses" onLogout={handleLogout} isLoggingOut={isLoggingOut} />

        <div className="flex-1 min-w-0">
          {feedback && (
            <p
              role="status"
              aria-live="polite"
              className="mb-6 text-sm font-sans text-text-primary border border-border px-4 py-3"
            >
              {feedback}
            </p>
          )}

          {loadError ? (
            <AddressesError onRetry={retryLoad} />
          ) : !addressesHydrated ? (
            <AddressesContentSkeleton />
          ) : view.type === 'add' ? (
            <AddressForm
              addressCount={addresses.length}
              onCancel={() => setView({ type: 'list' })}
              onSaved={handleSaved}
            />
          ) : view.type === 'edit' && editingAddress ? (
            <AddressForm
              address={editingAddress}
              addressCount={addresses.length}
              onCancel={() => setView({ type: 'list' })}
              onSaved={handleSaved}
            />
          ) : addresses.length === 0 ? (
            <EmptyAddresses onAdd={() => setView({ type: 'add' })} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  isPendingDelete={pendingDeleteId === address.id}
                  onEdit={() => setView({ type: 'edit', id: address.id })}
                  onRequestDelete={() => setPendingDeleteId(address.id)}
                  onCancelDelete={() => setPendingDeleteId(null)}
                  onConfirmDelete={() => handleConfirmDelete(address.id)}
                  onSetDefault={() => handleSetDefault(address.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
