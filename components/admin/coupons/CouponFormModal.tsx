'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { AlertIcon } from '@/components/admin/icons'
import {
  createInitialCouponForm,
  createCoupon,
  updateCoupon,
  couponToFormValues,
  hasCouponFormErrors,
  validateCouponForm,
  CouponValidationError,
} from '@/lib/admin/coupons'
import type { AdminCouponRow, CouponFormValues } from '@/lib/admin/coupons'
import type { CouponType } from '@/lib/cart-pricing'

interface CouponFormModalProps {
  /** null → create a new coupon; set → edit this one. */
  coupon: AdminCouponRow | null
  onClose: () => void
  onSaved: (coupon: AdminCouponRow, mode: 'create' | 'edit') => void
}

export function CouponFormModal({ coupon, onClose, onSaved }: CouponFormModalProps) {
  const mode = coupon ? 'edit' : 'create'
  const [values, setValues] = useState<CouponFormValues>(() => (coupon ? couponToFormValues(coupon) : createInitialCouponForm()))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const codeInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => codeInputRef.current?.focus(), 80)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, input, textarea, select')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; isSubmitting toggles Escape behaviour
  }, [isSubmitting])

  const errors = useMemo(() => validateCouponForm(values, coupon?.id), [values, coupon?.id])
  const isFormValid = !hasCouponFormErrors(errors)

  function patch(fields: Partial<CouponFormValues>) {
    setValues((prev) => ({ ...prev, ...fields }))
    if (submitError) setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    setTouched({ code: true, value: true, minOrderAmount: true, maxDiscountAmount: true, usageLimit: true, startDate: true, expiryDate: true })
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const saved = coupon ? await updateCoupon(coupon.id, values) : await createCoupon(values)
      onSaved(saved, mode)
      onClose()
    } catch (err) {
      if (err instanceof CouponValidationError) {
        setSubmitError(err.errors.code ?? 'Please review the highlighted fields and try again.')
      } else {
        setSubmitError("Couldn't save this coupon. Please try again.")
      }
      setIsSubmitting(false)
    }
  }

  const errorFor = (field: keyof CouponFormValues) => (touched[field] || hasAttemptedSubmit ? (errors as Record<string, string | undefined>)[field] : undefined)
  const invalid = (field: keyof CouponFormValues) => !!errorFor(field)
  const titleId = 'coupon-modal-title'

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:top-1/2 w-full sm:w-[480px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-sm shadow-card"
      >
        <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
          <h2 id={titleId} className="font-display text-xl text-text-primary">
            {mode === 'create' ? 'Add Coupon' : 'Edit Coupon'}
          </h2>

          {submitError && (
            <div role="alert" className="border border-sale/30 bg-sale/5 text-sale rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans">
              <AlertIcon className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <FormField label="Coupon Code" htmlFor="coupon-code" required error={errorFor('code')}>
              <input
                ref={codeInputRef}
                id="coupon-code"
                type="text"
                required
                placeholder="WELCOME10"
                value={values.code}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                onBlur={() => setTouched((prev) => ({ ...prev, code: true }))}
                aria-invalid={invalid('code')}
                className={fieldInputClass(invalid('code')) + ' font-mono uppercase tracking-wide'}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount Type" htmlFor="coupon-type" required>
                <select
                  id="coupon-type"
                  value={values.type}
                  onChange={(e) => patch({ type: e.target.value as CouponType })}
                  className={fieldInputClass(false)}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </FormField>

              <FormField
                label={values.type === 'percentage' ? 'Discount Value (%)' : 'Discount Value (₹)'}
                htmlFor="coupon-value"
                required
                error={errorFor('value')}
              >
                <input
                  id="coupon-value"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  required
                  placeholder={values.type === 'percentage' ? '10' : '500'}
                  value={values.value}
                  onChange={(e) => patch({ value: e.target.value })}
                  onBlur={() => setTouched((prev) => ({ ...prev, value: true }))}
                  aria-invalid={invalid('value')}
                  className={fieldInputClass(invalid('value'))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min. Order Amount (₹)" htmlFor="coupon-min-order" error={errorFor('minOrderAmount')}>
                <input
                  id="coupon-min-order"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={values.minOrderAmount}
                  onChange={(e) => patch({ minOrderAmount: e.target.value })}
                  onBlur={() => setTouched((prev) => ({ ...prev, minOrderAmount: true }))}
                  aria-invalid={invalid('minOrderAmount')}
                  className={fieldInputClass(invalid('minOrderAmount'))}
                />
              </FormField>

              {values.type === 'percentage' && (
                <FormField label="Max. Discount (₹)" htmlFor="coupon-max-discount" error={errorFor('maxDiscountAmount')}>
                  <input
                    id="coupon-max-discount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    placeholder="Optional"
                    value={values.maxDiscountAmount}
                    onChange={(e) => patch({ maxDiscountAmount: e.target.value })}
                    onBlur={() => setTouched((prev) => ({ ...prev, maxDiscountAmount: true }))}
                    aria-invalid={invalid('maxDiscountAmount')}
                    className={fieldInputClass(invalid('maxDiscountAmount'))}
                  />
                </FormField>
              )}
            </div>

            <FormField label="Usage Limit" htmlFor="coupon-usage-limit" error={errorFor('usageLimit')}>
              <input
                id="coupon-usage-limit"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="Optional — leave blank for unlimited"
                value={values.usageLimit}
                onChange={(e) => patch({ usageLimit: e.target.value })}
                onBlur={() => setTouched((prev) => ({ ...prev, usageLimit: true }))}
                aria-invalid={invalid('usageLimit')}
                className={fieldInputClass(invalid('usageLimit'))}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" htmlFor="coupon-start-date" required error={errorFor('startDate')}>
                <input
                  id="coupon-start-date"
                  type="date"
                  required
                  value={values.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                  onBlur={() => setTouched((prev) => ({ ...prev, startDate: true }))}
                  aria-invalid={invalid('startDate')}
                  className={fieldInputClass(invalid('startDate'))}
                />
              </FormField>

              <FormField label="Expiry Date" htmlFor="coupon-expiry-date" error={errorFor('expiryDate')}>
                <input
                  id="coupon-expiry-date"
                  type="date"
                  value={values.expiryDate}
                  onChange={(e) => patch({ expiryDate: e.target.value })}
                  onBlur={() => setTouched((prev) => ({ ...prev, expiryDate: true }))}
                  aria-invalid={invalid('expiryDate')}
                  className={fieldInputClass(invalid('expiryDate'))}
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="coupon-status">
              <select
                id="coupon-status"
                value={values.enabled ? 'Active' : 'Disabled'}
                onChange={(e) => patch({ enabled: e.target.value === 'Active' })}
                className={fieldInputClass(false)}
              >
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
              <p className="text-[11px] font-sans text-text-secondary mt-1">
                Scheduled and Expired are set automatically from the start/expiry dates above.
              </p>
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="h-10 px-5 inline-flex items-center gap-2 text-xs font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              )}
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Add Coupon' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
