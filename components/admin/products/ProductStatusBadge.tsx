import React from 'react'
import type { AdminProductStatus } from '@/lib/admin/products'

// Colour cue paired with text, never colour alone — mirrors
// components/admin/OrderStatusBadge.tsx's convention.
const DOT_CLASSES: Record<AdminProductStatus, string> = {
  Active: 'bg-[#2F7A4D]',
  Inactive: 'bg-text-secondary',
}

export function ProductStatusBadge({ status }: { status: AdminProductStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-text-primary">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASSES[status]}`} aria-hidden="true" />
      {status}
    </span>
  )
}
