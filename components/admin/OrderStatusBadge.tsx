import React from 'react'
import type { OrderStatus } from '@/lib/types'

// A colour cue paired with the status text — never colour alone, since the
// text label is what actually communicates the status (screen readers and
// colour-blind admins get the same information everyone else does).
const STATUS_DOT_CLASSES: Record<OrderStatus, string> = {
  Delivered: 'bg-[#2F7A4D]',
  Shipped: 'bg-[#2563EB]',
  'Out for Delivery': 'bg-accent-dark',
  Confirmed: 'bg-text-secondary',
  Processing: 'bg-[#B45309]',
  Cancelled: 'bg-sale',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-text-primary">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_CLASSES[status]}`}
        aria-hidden="true"
      />
      {status}
    </span>
  )
}
