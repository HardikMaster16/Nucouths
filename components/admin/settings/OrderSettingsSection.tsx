'use client'

import React, { useMemo, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { CheckCircleIcon, AlertIcon } from '@/components/admin/icons'
import { saveOrderSettings, validateOrderSettings, SettingsValidationError } from '@/lib/admin/settings'
import type { OrderSettings } from '@/lib/admin/settings'

interface OrderSettingsSectionProps {
  initialValues: OrderSettings
}

// Minimum order amount and cancellations aren't shown here — neither exists
// anywhere in the current checkout/order model (lib/checkout-validation.ts
// has no minimum-order rule, and no surface lets a customer or admin cancel
// an order; PlacedOrder.status can only *arrive* as 'Cancelled' from seed
// data). Adding toggles for either would be settings for a feature this app
// doesn't have.
export function OrderSettingsSection({ initialValues }: OrderSettingsSectionProps) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const errors = useMemo(() => validateOrderSettings(values), [values])
  const error = touched ? errors.orderPrefix : undefined

  function patch(fields: Partial<OrderSettings>) {
    setValues((prev) => ({ ...prev, ...fields }))
    if (feedback) setFeedback(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (errors.orderPrefix) return

    setIsSaving(true)
    setFeedback(null)
    try {
      const saved = await saveOrderSettings(values)
      setValues(saved)
      setFeedback({ type: 'success', message: 'Order settings saved.' })
    } catch (err) {
      const message = err instanceof SettingsValidationError ? 'Please review the highlighted field.' : "Couldn't save — please try again."
      setFeedback({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-1">Order Settings</h2>
      <p className="text-xs font-sans text-text-secondary mb-4">The prefix applied to every new order number.</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Order Prefix" htmlFor="order-prefix" required error={error} className="max-w-xs">
          <input
            id="order-prefix"
            type="text"
            required
            value={values.orderPrefix}
            onChange={(e) => patch({ orderPrefix: e.target.value.toUpperCase() })}
            onBlur={() => setTouched(true)}
            aria-invalid={!!error}
            className={fieldInputClass(!!error) + ' font-mono uppercase tracking-wide'}
          />
        </FormField>
        <p className="text-[11px] font-sans text-text-secondary -mt-2">
          Example: an order placed today would be numbered “{values.orderPrefix || 'NCT'}-XXXXXXX”.
        </p>

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
