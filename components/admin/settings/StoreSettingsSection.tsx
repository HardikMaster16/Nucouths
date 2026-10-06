'use client'

import React, { useMemo, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { CheckCircleIcon, AlertIcon } from '@/components/admin/icons'
import { saveStoreSettings, validateStoreSettings, SettingsValidationError } from '@/lib/admin/settings'
import type { StoreSettings } from '@/lib/admin/settings'

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP']
const TIME_ZONE_OPTIONS = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York']

interface StoreSettingsSectionProps {
  initialValues: StoreSettings
}

export function StoreSettingsSection({ initialValues }: StoreSettingsSectionProps) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const errors = useMemo(() => validateStoreSettings(values), [values])
  const errorFor = (field: keyof typeof errors) => (touched[field] ? errors[field] : undefined)
  const invalid = (field: keyof typeof errors) => !!errorFor(field)

  function patch(fields: Partial<StoreSettings>) {
    setValues((prev) => ({ ...prev, ...fields }))
    if (feedback) setFeedback(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ storeName: true, storeEmail: true, storePhone: true })
    if (Object.values(errors).some(Boolean)) return

    setIsSaving(true)
    setFeedback(null)
    try {
      const saved = await saveStoreSettings(values)
      setValues(saved)
      setFeedback({ type: 'success', message: 'Store settings saved.' })
    } catch (err) {
      const message = err instanceof SettingsValidationError ? 'Please review the highlighted fields.' : "Couldn't save — please try again."
      setFeedback({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-1">Store Settings</h2>
      <p className="text-xs font-sans text-text-secondary mb-4">Your store&apos;s basic identity and contact details.</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Store Name" htmlFor="store-name" required error={errorFor('storeName')}>
            <input
              id="store-name"
              type="text"
              required
              value={values.storeName}
              onChange={(e) => patch({ storeName: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, storeName: true }))}
              aria-invalid={invalid('storeName')}
              className={fieldInputClass(invalid('storeName'))}
            />
          </FormField>

          <FormField label="Store Email" htmlFor="store-email" required error={errorFor('storeEmail')}>
            <input
              id="store-email"
              type="email"
              required
              value={values.storeEmail}
              onChange={(e) => patch({ storeEmail: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, storeEmail: true }))}
              aria-invalid={invalid('storeEmail')}
              className={fieldInputClass(invalid('storeEmail'))}
            />
          </FormField>

          <FormField label="Store Phone" htmlFor="store-phone" error={errorFor('storePhone')}>
            <input
              id="store-phone"
              type="tel"
              value={values.storePhone}
              onChange={(e) => patch({ storePhone: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, storePhone: true }))}
              aria-invalid={invalid('storePhone')}
              className={fieldInputClass(invalid('storePhone'))}
            />
          </FormField>

          <FormField label="Currency" htmlFor="store-currency">
            <select
              id="store-currency"
              value={values.currency}
              onChange={(e) => patch({ currency: e.target.value })}
              className={fieldInputClass(false)}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Store Address" htmlFor="store-address" className="sm:col-span-2">
            <textarea
              id="store-address"
              rows={2}
              value={values.storeAddress}
              onChange={(e) => patch({ storeAddress: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-sm border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus:border-text-primary resize-y"
            />
          </FormField>

          <FormField label="Time Zone" htmlFor="store-timezone">
            <select
              id="store-timezone"
              value={values.timeZone}
              onChange={(e) => patch({ timeZone: e.target.value })}
              className={fieldInputClass(false)}
            >
              {TIME_ZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
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
