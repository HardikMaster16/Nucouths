'use client'

import React from 'react'
import { FormField, fieldInputClass } from './FormField'
import type { CheckoutFormData, CheckoutFieldErrors } from '@/lib/checkout-validation'

interface ContactSectionProps {
  data: CheckoutFormData
  errors: CheckoutFieldErrors
  touched: Partial<Record<keyof CheckoutFormData, boolean>>
  onChange: (field: keyof CheckoutFormData, value: string) => void
  onBlur: (field: keyof CheckoutFormData) => void
}

export function ContactSection({ data, errors, touched, onChange, onBlur }: ContactSectionProps) {
  return (
    <section className="flex flex-col gap-5 pb-8 sm:pb-10 border-b border-border">
      <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
        Contact Information
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <FormField
          label="Email Address"
          htmlFor="email"
          required
          error={touched.email ? errors.email : undefined}
        >
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            onBlur={() => onBlur('email')}
            aria-invalid={!!(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
            className={fieldInputClass(!!(touched.email && errors.email))}
          />
        </FormField>

        <FormField
          label="Phone Number"
          htmlFor="phone"
          required
          error={touched.phone ? errors.phone : undefined}
        >
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            placeholder="98765 43210"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            onBlur={() => onBlur('phone')}
            aria-invalid={!!(touched.phone && errors.phone)}
            aria-describedby={touched.phone && errors.phone ? 'phone-error' : undefined}
            className={fieldInputClass(!!(touched.phone && errors.phone))}
          />
        </FormField>
      </div>
    </section>
  )
}
