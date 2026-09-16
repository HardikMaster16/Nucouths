import React from 'react'
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-pricing'
import type { CartTotals } from '@/lib/cart-pricing'

export function DeliverySection({ currency, totals }: { currency: string; totals: CartTotals }) {
  return (
    <section className="flex flex-col gap-4 pb-8 sm:pb-10 border-b border-border">
      <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
        Delivery
      </h2>
      <div className="border border-border p-4 sm:p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-sans font-medium text-text-primary">Standard Delivery</p>
          <p className="text-xs font-sans text-text-secondary mt-0.5">
            Free delivery on orders above {formatPrice(FREE_SHIPPING_THRESHOLD, currency)}
          </p>
        </div>
        <p className="text-sm font-sans font-semibold text-text-primary shrink-0">
          {totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping, currency)}
        </p>
      </div>
    </section>
  )
}
