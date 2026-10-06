'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Checkout Saved Address Picker
//
// New, additive to the existing manual Shipping Address form (ShippingSection
// is untouched) — lets a signed-in customer fill that form from one of their
// own saved addresses instead of retyping it. Selecting a card re-verifies
// ownership server-side via selectCheckoutAddressAction (never trusts the id
// alone) before applying it to the form. The manual fields stay fully
// editable either way — this never replaces ShippingSection, only pre-fills it.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { selectCheckoutAddressAction } from '@/lib/checkout.actions'
import type { Address } from '@/lib/types'
import type { CheckoutFormData } from '@/lib/checkout-validation'

interface SavedAddressPickerProps {
  addresses: Address[]
  selectedId: string | undefined
  onSelect: (addressId: string, fields: Partial<CheckoutFormData>) => void
}

function toFormFields(address: Address): Partial<CheckoutFormData> {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    address: address.address,
    apartment: address.apartment ?? '',
    city: address.city,
    state: address.state,
    pinCode: address.pinCode,
    country: address.country,
    shippingPhone: address.phone,
  }
}

export function SavedAddressPicker({ addresses, selectedId, onSelect }: SavedAddressPickerProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (addresses.length === 0) return null

  async function handleSelect(addressId: string) {
    setPendingId(addressId)
    setError(null)
    try {
      const result = await selectCheckoutAddressAction(addressId)
      if (!result.success || !result.address) {
        setError(result.error ?? "Couldn't use that address. Please enter it manually.")
        return
      }
      onSelect(addressId, toFormFields(result.address))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-sans font-medium uppercase tracking-wide text-text-secondary">
        Use a saved address
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {addresses.map((addr) => {
          const isSelected = addr.id === selectedId
          const isPending = addr.id === pendingId
          return (
            <button
              key={addr.id}
              type="button"
              onClick={() => handleSelect(addr.id)}
              disabled={isPending}
              aria-pressed={isSelected}
              className={[
                'text-left border rounded-sm p-3.5 text-xs font-sans transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60',
                isSelected ? 'border-text-primary bg-surface' : 'border-border hover:bg-surface/60',
              ].join(' ')}
            >
              <span className="flex items-center gap-2 font-medium text-text-primary">
                {addr.label}
                {addr.isDefault && (
                  <span className="text-[10px] font-sans font-medium uppercase tracking-wide text-text-secondary">
                    Default
                  </span>
                )}
                {isPending && <span className="text-text-secondary">Applying…</span>}
              </span>
              <span className="block mt-1 text-text-secondary leading-relaxed">
                {addr.firstName} {addr.lastName} · {addr.address}
                {addr.apartment ? `, ${addr.apartment}` : ''} · {addr.city}, {addr.state} {addr.pinCode}
              </span>
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="text-[11px] font-sans text-sale">
          {error}
        </p>
      )}
    </div>
  )
}
