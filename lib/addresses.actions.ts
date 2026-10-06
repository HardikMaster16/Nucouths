'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Customer Address Mutations (Prisma)
//
// The real, server-side backend behind /account/addresses for a signed-in
// customer. Every export here is a Server Action reachable directly as a
// POST endpoint, so each one:
//
//   1. Calls requireCustomerSession() first, unconditionally, and uses ONLY
//      the userId it returns — a client-supplied id/label/anything else is
//      never trusted for identity. See lib/auth/customer-auth.actions.ts.
//   2. Re-validates the form using the exact same rules
//      components/account/AddressForm.tsx already validates client-side
//      (lib/checkout-validation.ts's isRequired/isValidIndianPhone/
//      isValidIndianPin — the same functions checkout's own shipping form
//      uses), since a raw POST to this action isn't bound by the client's
//      own validation.
//   3. Scopes every read/update/delete by `{ id, userId }` together, so an
//      address belonging to another customer is indistinguishable from one
//      that doesn't exist — "Address not found.", never a different error
//      that would leak whether it exists for someone else.
//   4. Keeps "at most one default address per customer" invariant using a
//      transaction (updateMany to unset the previous default, then set the
//      new one) — the same enforcement style this codebase already uses for
//      other single-row invariants (e.g. lib/admin/settings.actions.ts's
//      singleton StoreSettings row), not a schema-level constraint, since
//      Prisma's schema DSL can't express a partial unique index without raw
//      SQL and this is a single-writer-per-customer, low-contention case.
//
// Business rules mirror lib/address-context.tss's existing mock/localStorage
// implementation exactly (same create/update/delete/set-default semantics,
// including deleting the default promoting the oldest remaining address to
// default) — nothing here invents new UX, it's the same rules against a
// real database instead of localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { requireCustomerSession } from './auth/customer-auth.actions'
import { dbAddressToAddress, listAddressesForUser } from './addresses.db'
import { isRequired, isValidIndianPhone, isValidIndianPin } from './checkout-validation'
import type { Prisma } from '@prisma/client'
import type { Address, AddressLabel } from './types'

export type AddressInput = Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

const VALID_LABELS: AddressLabel[] = ['Home', 'Work', 'Other']

function assertValidInput(input: AddressInput): void {
  if (!VALID_LABELS.includes(input.label)) throw new Error('Invalid address label.')
  if (!isRequired(input.firstName)) throw new Error('First name is required.')
  if (!isRequired(input.lastName)) throw new Error('Last name is required.')
  if (!isRequired(input.phone)) throw new Error('Phone number is required.')
  if (!isValidIndianPhone(input.phone)) throw new Error('Enter a valid 10-digit mobile number.')
  if (!isRequired(input.address)) throw new Error('Address is required.')
  if (!isRequired(input.city)) throw new Error('City is required.')
  if (!isRequired(input.state)) throw new Error('State is required.')
  if (!isRequired(input.pinCode)) throw new Error('PIN code is required.')
  if (!isValidIndianPin(input.pinCode)) throw new Error('Enter a valid 6-digit PIN code.')
  if (!isRequired(input.country)) throw new Error('Country is required.')
}

function normalizedFields(input: AddressInput) {
  return {
    label: input.label,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    apartment: input.apartment?.trim() || null,
    city: input.city.trim(),
    state: input.state,
    pinCode: input.pinCode.trim(),
    country: input.country.trim(),
  }
}

export async function listAddressesAction(): Promise<Address[]> {
  const { id: userId } = await requireCustomerSession()
  return listAddressesForUser(userId)
}

export async function createAddressAction(input: AddressInput): Promise<Address> {
  const { id: userId } = await requireCustomerSession()
  assertValidInput(input)

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingCount = await tx.address.count({ where: { userId } })
    const shouldBeDefault = input.isDefault || existingCount === 0

    if (shouldBeDefault) {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
    }

    return tx.address.create({
      data: { userId, ...normalizedFields(input), isDefault: shouldBeDefault },
    })
  })

  return dbAddressToAddress(created)
}

export async function updateAddressAction(id: string, input: AddressInput): Promise<Address> {
  const { id: userId } = await requireCustomerSession()
  assertValidInput(input)

  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Never trust that `id` (client-supplied) refers to a row this
      // customer owns — scope the existence check by userId too, so an id
      // belonging to another customer behaves as not-found.
      const existing = await tx.address.findFirst({ where: { id, userId } })
      if (!existing) throw new Error('Address not found.')

      if (input.isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } })
      }

      return tx.address.update({
        where: { id },
        data: { ...normalizedFields(input), isDefault: input.isDefault },
      })
    })

    return dbAddressToAddress(updated)
  } catch (err) {
    throw err instanceof Error ? err : new Error('Could not update address.')
  }
}

export async function deleteAddressAction(id: string): Promise<void> {
  const { id: userId } = await requireCustomerSession()

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.address.findFirst({ where: { id, userId } })
    if (!existing) throw new Error('Address not found.')

    await tx.address.delete({ where: { id } })

    // Deleting the default must leave a consistent default state — promote
    // the oldest remaining address, same rule lib/address-context.tsx's
    // deleteAddress already applies.
    if (existing.isDefault) {
      const oldest = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })
      if (oldest) {
        await tx.address.update({ where: { id: oldest.id }, data: { isDefault: true } })
      }
    }
  })
}

export async function setDefaultAddressAction(id: string): Promise<void> {
  const { id: userId } = await requireCustomerSession()

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.address.findFirst({ where: { id, userId } })
    if (!existing) throw new Error('Address not found.')

    await tx.address.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } })
    await tx.address.update({ where: { id }, data: { isDefault: true } })
  })
}
