'use client'

import React from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import type { ProductFormErrors, ProductFormValues, ScalarProductField } from '@/lib/admin/product-service'

interface PricingSectionProps {
  values: ProductFormValues
  errors: ProductFormErrors
  touched: Record<string, boolean>
  onChange: (patch: Partial<ProductFormValues>) => void
  onBlur: (field: string) => void
}

// NUCOUTHS' Product/ProductDetail type (lib/types.ts) has no tax/GST field —
// there's no tax model in the catalog yet, so this form doesn't invent one.
// Currency is fixed to 'INR' here too, matching every existing catalog entry
// (lib/mock-data.ts) — not exposed as a field until a second currency exists.
export function PricingSection({ values, errors, touched, onChange, onBlur }: PricingSectionProps) {
  const errorFor = (field: ScalarProductField) => (touched[field] ? errors[field] : undefined)
  const invalid = (field: ScalarProductField) => !!(touched[field] && errors[field])

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Pricing</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <FormField label="Price (₹)" htmlFor="product-price" required error={errorFor('price')}>
          <input
            id="product-price"
            name="price"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            required
            placeholder="4999"
            value={values.price}
            onChange={(e) => onChange({ price: e.target.value })}
            onBlur={() => onBlur('price')}
            aria-invalid={invalid('price')}
            aria-describedby={invalid('price') ? 'product-price-error' : undefined}
            className={fieldInputClass(invalid('price'))}
          />
        </FormField>

        <FormField
          label="Compare-at Price (₹)"
          htmlFor="product-compare-at-price"
          error={errorFor('compareAtPrice')}
        >
          <input
            id="product-compare-at-price"
            name="compareAtPrice"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="5999"
            value={values.compareAtPrice}
            onChange={(e) => onChange({ compareAtPrice: e.target.value })}
            onBlur={() => onBlur('compareAtPrice')}
            aria-invalid={invalid('compareAtPrice')}
            aria-describedby={invalid('compareAtPrice') ? 'product-compare-at-price-error' : undefined}
            className={fieldInputClass(invalid('compareAtPrice'))}
          />
        </FormField>
      </div>
    </section>
  )
}
