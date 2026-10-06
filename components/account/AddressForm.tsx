'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Address Form
//
// One form for both Add and Edit (pass `address` to edit) — reuses the exact
// checkout field pieces (FormField/fieldInputClass, INDIAN_STATES, the same
// isRequired/isValidIndianPhone/isValidIndianPin validators ShippingSection
// uses) so a saved address is validated identically to a checkout address.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { Button } from '@/components/ui/Button'
import { useAddresses } from '@/lib/address-context'
import { isRequired, isValidIndianPhone, isValidIndianPin, INDIAN_STATES } from '@/lib/checkout-validation'
import type { Address, AddressLabel } from '@/lib/types'

const ADDRESS_LABELS: AddressLabel[] = ['Home', 'Work', 'Other']

interface FormValues {
  label: AddressLabel
  firstName: string
  lastName: string
  phone: string
  address: string
  apartment: string
  city: string
  state: string
  pinCode: string
  country: string
  isDefault: boolean
}

function toFormValues(address?: Address): FormValues {
  if (!address) {
    return {
      label: 'Home',
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      apartment: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
      isDefault: false,
    }
  }
  return {
    label: address.label,
    firstName: address.firstName,
    lastName: address.lastName,
    phone: address.phone,
    address: address.address,
    apartment: address.apartment ?? '',
    city: address.city,
    state: address.state,
    pinCode: address.pinCode,
    country: address.country,
    isDefault: address.isDefault,
  }
}

type TouchedMap = Partial<Record<keyof FormValues, boolean>>
type ErrorMap = Partial<Record<keyof FormValues, string>>

const REQUIRED_FIELDS: (keyof FormValues)[] = [
  'firstName', 'lastName', 'phone', 'address', 'city', 'state', 'pinCode', 'country',
]

interface AddressFormProps {
  /** Present when editing an existing address; absent when adding a new one. */
  address?: Address
  /** How many addresses the customer already has — the sole existing address
   *  must always stay the default, so its checkbox is locked on. */
  addressCount: number
  onCancel: () => void
  onSaved: (message: string) => void
}

export function AddressForm({ address, addressCount, onCancel, onSaved }: AddressFormProps) {
  const { addAddress, updateAddress } = useAddresses()
  const [values, setValues] = useState<FormValues>(() => toFormValues(address))
  const [touched, setTouched] = useState<TouchedMap>({})

  const isOnlyAddress = addressCount === 1 && !!address
  const effectiveIsDefault = isOnlyAddress ? true : values.isDefault

  const errors: ErrorMap = {}
  if (!isRequired(values.firstName)) errors.firstName = 'First name is required.'
  if (!isRequired(values.lastName)) errors.lastName = 'Last name is required.'
  if (!isRequired(values.phone)) errors.phone = 'Phone number is required.'
  else if (!isValidIndianPhone(values.phone)) errors.phone = 'Enter a valid 10-digit mobile number.'
  if (!isRequired(values.address)) errors.address = 'Address is required.'
  if (!isRequired(values.city)) errors.city = 'City is required.'
  if (!isRequired(values.state)) errors.state = 'State is required.'
  if (!isRequired(values.pinCode)) errors.pinCode = 'PIN code is required.'
  else if (!isValidIndianPin(values.pinCode)) errors.pinCode = 'Enter a valid 6-digit PIN code.'
  if (!isRequired(values.country)) errors.country = 'Country is required.'

  const isValid = Object.keys(errors).length === 0

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [field]: value }))
  const blur = (field: keyof FormValues) => setTouched((prev) => ({ ...prev, [field]: true }))
  const errorFor = (field: keyof FormValues) => (touched[field] ? errors[field] : undefined)
  const invalid = (field: keyof FormValues) => !!(touched[field] && errors[field])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, true])) as TouchedMap)
    if (!isValid) return

    const input = {
      label: values.label,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      apartment: values.apartment.trim() || undefined,
      city: values.city.trim(),
      state: values.state,
      pinCode: values.pinCode.trim(),
      country: values.country.trim(),
      isDefault: effectiveIsDefault,
    }

    if (address) {
      updateAddress(address.id, input)
      onSaved('Address updated')
    } else {
      addAddress(input)
      onSaved('Address saved')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="border border-border p-6 sm:p-8 flex flex-col gap-6">
      <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
        {address ? 'Edit Address' : 'Add New Address'}
      </h2>

      {/* Address label */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-sans font-semibold tracking-[0.1em] uppercase text-text-primary">
          Address Label
        </span>
        <div role="radiogroup" aria-label="Address label" className="flex gap-2 flex-wrap">
          {ADDRESS_LABELS.map((label) => {
            const checked = values.label === label
            return (
              <label
                key={label}
                className={[
                  'flex items-center gap-2 border px-4 py-2 cursor-pointer transition-colors duration-150',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-primary has-[:focus-visible]:ring-offset-1',
                  checked ? 'border-text-primary' : 'border-border hover:border-text-secondary',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="addressLabel"
                  value={label}
                  checked={checked}
                  onChange={() => set('label', label)}
                  className="sr-only"
                />
                <span className="text-sm font-sans text-text-primary">{label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <FormField label="First Name" htmlFor="addr-firstName" required error={errorFor('firstName')}>
          <input
            id="addr-firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            value={values.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            onBlur={() => blur('firstName')}
            aria-invalid={invalid('firstName')}
            aria-describedby={invalid('firstName') ? 'addr-firstName-error' : undefined}
            className={fieldInputClass(invalid('firstName'))}
          />
        </FormField>

        <FormField label="Last Name" htmlFor="addr-lastName" required error={errorFor('lastName')}>
          <input
            id="addr-lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            value={values.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            onBlur={() => blur('lastName')}
            aria-invalid={invalid('lastName')}
            aria-describedby={invalid('lastName') ? 'addr-lastName-error' : undefined}
            className={fieldInputClass(invalid('lastName'))}
          />
        </FormField>

        <FormField
          label="Phone Number"
          htmlFor="addr-phone"
          required
          error={errorFor('phone')}
          className="sm:col-span-2"
        >
          <input
            id="addr-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            placeholder="98765 43210"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            onBlur={() => blur('phone')}
            aria-invalid={invalid('phone')}
            aria-describedby={invalid('phone') ? 'addr-phone-error' : undefined}
            className={fieldInputClass(invalid('phone'))}
          />
        </FormField>

        <FormField
          label="Address"
          htmlFor="addr-address"
          required
          error={errorFor('address')}
          className="sm:col-span-2"
        >
          <input
            id="addr-address"
            name="address"
            type="text"
            required
            autoComplete="address-line1"
            placeholder="House no., street, area"
            value={values.address}
            onChange={(e) => set('address', e.target.value)}
            onBlur={() => blur('address')}
            aria-invalid={invalid('address')}
            aria-describedby={invalid('address') ? 'addr-address-error' : undefined}
            className={fieldInputClass(invalid('address'))}
          />
        </FormField>

        <FormField label="Apartment / Suite / Floor" htmlFor="addr-apartment" className="sm:col-span-2">
          <input
            id="addr-apartment"
            name="apartment"
            type="text"
            autoComplete="address-line2"
            value={values.apartment}
            onChange={(e) => set('apartment', e.target.value)}
            className={fieldInputClass(false)}
          />
        </FormField>

        <FormField label="City" htmlFor="addr-city" required error={errorFor('city')}>
          <input
            id="addr-city"
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            value={values.city}
            onChange={(e) => set('city', e.target.value)}
            onBlur={() => blur('city')}
            aria-invalid={invalid('city')}
            aria-describedby={invalid('city') ? 'addr-city-error' : undefined}
            className={fieldInputClass(invalid('city'))}
          />
        </FormField>

        <FormField label="State" htmlFor="addr-state" required error={errorFor('state')}>
          <select
            id="addr-state"
            name="state"
            required
            autoComplete="address-level1"
            value={values.state}
            onChange={(e) => set('state', e.target.value)}
            onBlur={() => blur('state')}
            aria-invalid={invalid('state')}
            aria-describedby={invalid('state') ? 'addr-state-error' : undefined}
            className={fieldInputClass(invalid('state'))}
          >
            <option value="">Select a state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="PIN Code" htmlFor="addr-pinCode" required error={errorFor('pinCode')}>
          <input
            id="addr-pinCode"
            name="pinCode"
            type="text"
            required
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            value={values.pinCode}
            onChange={(e) => set('pinCode', e.target.value.replace(/\D/g, ''))}
            onBlur={() => blur('pinCode')}
            aria-invalid={invalid('pinCode')}
            aria-describedby={invalid('pinCode') ? 'addr-pinCode-error' : undefined}
            className={fieldInputClass(invalid('pinCode'))}
          />
        </FormField>

        <FormField label="Country" htmlFor="addr-country" required error={errorFor('country')}>
          <input
            id="addr-country"
            name="country"
            type="text"
            required
            autoComplete="country-name"
            value={values.country}
            onChange={(e) => set('country', e.target.value)}
            onBlur={() => blur('country')}
            aria-invalid={invalid('country')}
            aria-describedby={invalid('country') ? 'addr-country-error' : undefined}
            className={fieldInputClass(invalid('country'))}
          />
        </FormField>
      </div>

      <div className="flex items-start gap-2.5">
        <input
          id="addr-isDefault"
          type="checkbox"
          checked={effectiveIsDefault}
          disabled={isOnlyAddress}
          onChange={(e) => set('isDefault', e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 rounded-sm border border-border accent-text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label htmlFor="addr-isDefault" className="text-xs font-sans text-text-secondary leading-relaxed cursor-pointer">
          {isOnlyAddress ? 'This is your only address, so it stays your default.' : 'Set as default address'}
        </label>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg">
          Save Address
        </Button>
      </div>
    </form>
  )
}
