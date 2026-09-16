'use client'

import React from 'react'
import { FormField, fieldInputClass } from './FormField'
import { INDIAN_STATES } from '@/lib/checkout-validation'
import type { CheckoutFormData, CheckoutFieldErrors } from '@/lib/checkout-validation'

interface ShippingSectionProps {
  data: CheckoutFormData
  errors: CheckoutFieldErrors
  touched: Partial<Record<keyof CheckoutFormData, boolean>>
  onChange: (field: keyof CheckoutFormData, value: string) => void
  onBlur: (field: keyof CheckoutFormData) => void
}

export function ShippingSection({ data, errors, touched, onChange, onBlur }: ShippingSectionProps) {
  const errorFor = (field: keyof CheckoutFormData) => (touched[field] ? errors[field] : undefined)
  const invalid = (field: keyof CheckoutFormData) => !!(touched[field] && errors[field])

  return (
    <section className="flex flex-col gap-5 pb-8 sm:pb-10 border-b border-border">
      <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
        Shipping Address
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <FormField label="First Name" htmlFor="firstName" required error={errorFor('firstName')}>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            placeholder="Aanya"
            value={data.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            onBlur={() => onBlur('firstName')}
            aria-invalid={invalid('firstName')}
            aria-describedby={invalid('firstName') ? 'firstName-error' : undefined}
            className={fieldInputClass(invalid('firstName'))}
          />
        </FormField>

        <FormField label="Last Name" htmlFor="lastName" required error={errorFor('lastName')}>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            placeholder="Sharma"
            value={data.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            onBlur={() => onBlur('lastName')}
            aria-invalid={invalid('lastName')}
            aria-describedby={invalid('lastName') ? 'lastName-error' : undefined}
            className={fieldInputClass(invalid('lastName'))}
          />
        </FormField>

        <FormField label="Address" htmlFor="address" required error={errorFor('address')} className="sm:col-span-2">
          <input
            id="address"
            name="address"
            type="text"
            required
            autoComplete="address-line1"
            placeholder="House no., street, area"
            value={data.address}
            onChange={(e) => onChange('address', e.target.value)}
            onBlur={() => onBlur('address')}
            aria-invalid={invalid('address')}
            aria-describedby={invalid('address') ? 'address-error' : undefined}
            className={fieldInputClass(invalid('address'))}
          />
        </FormField>

        <FormField label="Apartment, suite, etc. (optional)" htmlFor="apartment" className="sm:col-span-2">
          <input
            id="apartment"
            name="apartment"
            type="text"
            autoComplete="address-line2"
            placeholder="Apartment, floor, landmark"
            value={data.apartment}
            onChange={(e) => onChange('apartment', e.target.value)}
            className={fieldInputClass(false)}
          />
        </FormField>

        <FormField label="City" htmlFor="city" required error={errorFor('city')}>
          <input
            id="city"
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            placeholder="Mumbai"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            onBlur={() => onBlur('city')}
            aria-invalid={invalid('city')}
            aria-describedby={invalid('city') ? 'city-error' : undefined}
            className={fieldInputClass(invalid('city'))}
          />
        </FormField>

        <FormField label="State / Province" htmlFor="state" required error={errorFor('state')}>
          <select
            id="state"
            name="state"
            required
            autoComplete="address-level1"
            value={data.state}
            onChange={(e) => onChange('state', e.target.value)}
            onBlur={() => onBlur('state')}
            aria-invalid={invalid('state')}
            aria-describedby={invalid('state') ? 'state-error' : undefined}
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

        <FormField label="PIN Code" htmlFor="pinCode" required error={errorFor('pinCode')}>
          <input
            id="pinCode"
            name="pinCode"
            type="text"
            required
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="400001"
            maxLength={6}
            value={data.pinCode}
            onChange={(e) => onChange('pinCode', e.target.value.replace(/\D/g, ''))}
            onBlur={() => onBlur('pinCode')}
            aria-invalid={invalid('pinCode')}
            aria-describedby={invalid('pinCode') ? 'pinCode-error' : undefined}
            className={fieldInputClass(invalid('pinCode'))}
          />
        </FormField>

        <FormField label="Country" htmlFor="country" required error={errorFor('country')}>
          <input
            id="country"
            name="country"
            type="text"
            required
            autoComplete="country-name"
            value={data.country}
            onChange={(e) => onChange('country', e.target.value)}
            onBlur={() => onBlur('country')}
            aria-invalid={invalid('country')}
            aria-describedby={invalid('country') ? 'country-error' : undefined}
            className={fieldInputClass(invalid('country'))}
          />
        </FormField>

        <FormField
          label="Phone Number"
          htmlFor="shippingPhone"
          required
          error={errorFor('shippingPhone')}
          className="sm:col-span-2"
        >
          <input
            id="shippingPhone"
            name="shippingPhone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            placeholder="Contact number for delivery"
            value={data.shippingPhone}
            onChange={(e) => onChange('shippingPhone', e.target.value)}
            onBlur={() => onBlur('shippingPhone')}
            aria-invalid={invalid('shippingPhone')}
            aria-describedby={invalid('shippingPhone') ? 'shippingPhone-error' : undefined}
            className={fieldInputClass(invalid('shippingPhone'))}
          />
        </FormField>
      </div>
    </section>
  )
}
