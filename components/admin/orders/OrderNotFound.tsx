import React from 'react'
import Link from 'next/link'
import { OrdersIcon } from '@/components/admin/icons'

/** The admin panel's "order not found" state — an invalid/unknown order
 *  number gets this instead of an empty page. */
export function OrderNotFound() {
  return (
    <div className="bg-white border border-border rounded-sm p-8 sm:p-12 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <OrdersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-2xl text-text-primary leading-tight">Order not found</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        This order doesn&apos;t exist. Double-check the order ID and try again from the orders list.
      </p>
      <Link
        href="/admin/orders"
        className="mt-3 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        ← Back to Orders
      </Link>
    </div>
  )
}
