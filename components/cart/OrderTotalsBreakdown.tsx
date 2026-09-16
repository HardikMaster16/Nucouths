import React from 'react'
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-pricing'
import type { CartTotals } from '@/lib/cart-pricing'

/** Shared Subtotal/Discount/Shipping/Total block — used by /cart and
 *  /checkout so the two never present numbers differently. */
export function OrderTotalsBreakdown({
  currency,
  totals,
}: {
  currency: string
  totals: CartTotals
}) {
  const { originalSubtotal, discount, shipping, total, amountToFreeShipping } = totals

  return (
    <>
      <div className="flex flex-col gap-3 text-sm font-sans">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Subtotal</span>
          <span className="text-text-primary font-medium">
            {formatPrice(originalSubtotal, currency)}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Discount</span>
            <span className="text-sale font-medium">−{formatPrice(discount, currency)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Shipping</span>
          <span className="text-text-primary font-medium">
            {shipping === 0 ? 'Free' : formatPrice(shipping, currency)}
          </span>
        </div>
      </div>

      <p className="text-[11px] font-sans text-text-secondary leading-relaxed">
        {shipping === 0 ? (
          <>You&apos;ve unlocked free shipping.</>
        ) : (
          <>
            Add {formatPrice(amountToFreeShipping, currency)} more for free shipping — free on
            orders above {formatPrice(FREE_SHIPPING_THRESHOLD, currency)}.
          </>
        )}
      </p>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-sans font-semibold uppercase tracking-wide text-text-primary">
          Total
        </span>
        <span className="text-lg font-sans font-semibold text-text-primary">
          {formatPrice(total, currency)}
        </span>
      </div>
    </>
  )
}
