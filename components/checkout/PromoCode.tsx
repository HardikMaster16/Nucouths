'use client'

import React, { useState, useTransition } from 'react'
import { fieldInputClass } from './FormField'
import { Button } from '@/components/ui/Button'
import { applyCouponAction, removeCouponAction } from '@/lib/checkout-coupon.actions'
import { formatPrice } from '@/lib/cart-pricing'
import type { CartTotals } from '@/lib/cart-pricing'

export interface AppliedCoupon {
  code: string
  discount: number
}

// Real, server-backed coupon apply/remove — every number shown here comes
// from lib/checkout-coupon.actions.ts's server actions (which re-derive the
// cart and validate the coupon against Prisma), never from client-side math.
// `onTotalsChange` hands the parent the exact totals the server returned, so
// this component never has to be trusted to compute a discount itself.
export function PromoCode({
  currency,
  appliedCoupon,
  onTotalsChange,
}: {
  currency: string
  appliedCoupon: AppliedCoupon | null
  onTotalsChange: (totals: CartTotals, coupon: AppliedCoupon | null) => void
}) {
  const [open, setOpen] = useState(Boolean(appliedCoupon))
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    if (!code.trim()) {
      setError('Enter a coupon code to apply.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await applyCouponAction(code)
      if (!result.success || !result.couponCode || result.couponDiscount === undefined) {
        setError(result.error ?? 'This coupon code is invalid.')
        return
      }
      onTotalsChange(result.totals, { code: result.couponCode, discount: result.couponDiscount })
      setCode('')
    })
  }

  const handleRemove = () => {
    setError(null)
    startTransition(async () => {
      const result = await removeCouponAction()
      onTotalsChange(result.totals, null)
    })
  }

  return (
    <div className="border-t border-border pt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="promo-code-panel"
        className="flex items-center justify-between w-full text-xs font-sans font-semibold tracking-[0.1em] uppercase text-text-primary hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        Have a promo code?
        <span
          aria-hidden="true"
          className={['transition-transform duration-200', open ? '-rotate-180' : ''].join(' ')}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div id="promo-code-panel" className="mt-3 flex flex-col gap-2">
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-2 border border-border bg-surface px-3.5 py-2.5">
              <span className="text-xs font-sans font-medium text-text-primary tracking-wide">
                {appliedCoupon.code} applied
                <span className="text-text-secondary font-normal normal-case tracking-normal ml-1.5">
                  −{formatPrice(appliedCoupon.discount, currency)}
                </span>
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleRemove} loading={isPending}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="promo-code" className="sr-only">
                Promo code
              </label>
              <input
                id="promo-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleApply()
                  }
                }}
                placeholder="Enter code"
                disabled={isPending}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'promo-code-error' : undefined}
                className={[fieldInputClass(Boolean(error)), 'flex-1'].join(' ')}
              />
              <Button type="button" variant="outline" size="md" onClick={handleApply} loading={isPending}>
                Apply
              </Button>
            </div>
          )}
          {error && (
            <p id="promo-code-error" role="alert" aria-live="polite" className="text-[11px] font-sans text-sale">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
