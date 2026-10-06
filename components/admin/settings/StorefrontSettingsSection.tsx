'use client'

import React, { useMemo, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { CheckCircleIcon, AlertIcon } from '@/components/admin/icons'
import { saveStorefrontSettings, validateStorefrontSettings, SettingsValidationError } from '@/lib/admin/settings'
import type { StorefrontFormValues, StorefrontSettings, StoreStatus } from '@/lib/admin/settings'

interface StorefrontSettingsSectionProps {
  initialValues: StorefrontSettings
}

function toFormValues(s: StorefrontSettings): StorefrontFormValues {
  return {
    storeStatus: s.storeStatus,
    lowStockThreshold: String(s.lowStockThreshold),
    defaultShippingCharge: String(s.defaultShippingCharge),
    freeShippingThreshold: String(s.freeShippingThreshold),
  }
}

export function StorefrontSettingsSection({ initialValues }: StorefrontSettingsSectionProps) {
  const [values, setValues] = useState<StorefrontFormValues>(() => toFormValues(initialValues))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const errors = useMemo(() => validateStorefrontSettings(values), [values])
  const errorFor = (field: keyof typeof errors) => (touched[field] ? errors[field] : undefined)
  const invalid = (field: keyof typeof errors) => !!errorFor(field)

  function patch(fields: Partial<StorefrontFormValues>) {
    setValues((prev) => ({ ...prev, ...fields }))
    if (feedback) setFeedback(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ lowStockThreshold: true, defaultShippingCharge: true, freeShippingThreshold: true })
    if (Object.values(errors).some(Boolean)) return

    setIsSaving(true)
    setFeedback(null)
    try {
      const saved = await saveStorefrontSettings(values)
      setValues(toFormValues(saved))
      setFeedback({ type: 'success', message: 'Storefront settings saved.' })
    } catch (err) {
      const message = err instanceof SettingsValidationError ? 'Please review the highlighted fields.' : "Couldn't save — please try again."
      setFeedback({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-1">Storefront</h2>
      <p className="text-xs font-sans text-text-secondary mb-4">
        Availability and the shipping/stock thresholds used across the storefront.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Store Status" htmlFor="storefront-status">
            <select
              id="storefront-status"
              value={values.storeStatus}
              onChange={(e) => patch({ storeStatus: e.target.value as StoreStatus })}
              className={fieldInputClass(false)}
            >
              <option value="Open">Open</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </FormField>

          <FormField
            label="Low-Stock Threshold"
            htmlFor="storefront-low-stock"
            required
            error={errorFor('lowStockThreshold')}
          >
            <input
              id="storefront-low-stock"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              required
              value={values.lowStockThreshold}
              onChange={(e) => patch({ lowStockThreshold: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, lowStockThreshold: true }))}
              aria-invalid={invalid('lowStockThreshold')}
              className={fieldInputClass(invalid('lowStockThreshold'))}
            />
          </FormField>

          <FormField
            label="Default Shipping Charge (₹)"
            htmlFor="storefront-shipping"
            required
            error={errorFor('defaultShippingCharge')}
          >
            <input
              id="storefront-shipping"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              required
              value={values.defaultShippingCharge}
              onChange={(e) => patch({ defaultShippingCharge: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, defaultShippingCharge: true }))}
              aria-invalid={invalid('defaultShippingCharge')}
              className={fieldInputClass(invalid('defaultShippingCharge'))}
            />
          </FormField>

          <FormField
            label="Free Shipping Threshold (₹)"
            htmlFor="storefront-free-shipping"
            required
            error={errorFor('freeShippingThreshold')}
          >
            <input
              id="storefront-free-shipping"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              required
              value={values.freeShippingThreshold}
              onChange={(e) => patch({ freeShippingThreshold: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, freeShippingThreshold: true }))}
              aria-invalid={invalid('freeShippingThreshold')}
              className={fieldInputClass(invalid('freeShippingThreshold'))}
            />
          </FormField>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSaving}
            aria-busy={isSaving}
            className="inline-flex items-center gap-2 h-10 px-5 text-xs font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />}
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
          {feedback && (
            <span
              role="status"
              className={['inline-flex items-center gap-1.5 text-xs font-sans', feedback.type === 'success' ? 'text-[#2F7A4D]' : 'text-sale'].join(' ')}
            >
              {feedback.type === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : <AlertIcon className="w-4 h-4" />}
              {feedback.message}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
