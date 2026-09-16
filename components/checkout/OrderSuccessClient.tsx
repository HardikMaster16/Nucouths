'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/cart-pricing'
import { getPlacedOrder } from '@/lib/order-storage'
import type { PlacedOrder } from '@/lib/order-storage'

const PAYMENT_METHOD_LABELS: Record<PlacedOrder['paymentMethod'], string> = {
  upi: 'UPI',
  card: 'Credit / Debit Card',
  netbanking: 'Net Banking',
  cod: 'Cash on Delivery',
}

function CheckCircleIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function OrderSuccessClient() {
  const router = useRouter()
  // undefined = not read yet (avoids an SSR/client mismatch + a "no order"
  // flash before sessionStorage has been checked), null = none found.
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined)

  useEffect(() => {
    setOrder(getPlacedOrder())
  }, [])

  if (order === undefined) return null

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 sm:py-28">
        <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight mb-3">
          No recent order found
        </h1>
        <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
          We couldn&apos;t find a recent order for this session.
        </p>
        <div className="w-full max-w-xs">
          <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/products')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    )
  }

  const { shippingAddress: addr } = order

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6 py-14 sm:py-20">
      <div className="text-text-primary" aria-hidden="true">
        <CheckCircleIcon />
      </div>

      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight mb-2">
          Order Confirmed
        </h1>
        <p className="text-sm font-sans text-text-secondary">Thank you for your order.</p>
      </div>

      <div className="w-full border border-border p-6 sm:p-8 flex flex-col gap-6 text-left">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-4">
          <div>
            <p className="text-[11px] font-sans font-semibold tracking-[0.1em] uppercase text-text-secondary">
              Order Number
            </p>
            <p className="text-sm font-sans font-medium text-text-primary mt-0.5">
              {order.orderNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-sans font-semibold tracking-[0.1em] uppercase text-text-secondary">
              Order Total
            </p>
            <p className="text-lg font-sans font-semibold text-text-primary mt-0.5">
              {formatPrice(order.totals.total, order.currency)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-sans font-semibold tracking-[0.1em] uppercase text-text-secondary mb-1.5">
            Delivery Address
          </p>
          <p className="text-sm font-sans text-text-primary leading-relaxed">
            {addr.firstName} {addr.lastName}
            <br />
            {addr.address}
            {addr.apartment ? `, ${addr.apartment}` : ''}
            <br />
            {addr.city}, {addr.state} {addr.pinCode}
            <br />
            {addr.country} &nbsp;·&nbsp; {addr.phone}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-sans font-semibold tracking-[0.1em] uppercase text-text-secondary mb-1.5">
            Payment Method
          </p>
          <p className="text-sm font-sans text-text-primary">
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs">
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/products')}>
          Continue Shopping
        </Button>
      </div>
    </div>
  )
}
