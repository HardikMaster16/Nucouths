import React from 'react'
import type { StockState } from '@/lib/types'

interface ProductStockBadgeProps {
  totalStock: number
  stockState: StockState
}

const CONFIG: Record<StockState, { label: string; classes: string }> = {
  'in-stock': { label: 'In Stock', classes: 'text-[#2F7A4D] border-[#2F7A4D]/30 bg-[#2F7A4D]/5' },
  'low-stock': { label: 'Low Stock', classes: 'text-[#B45309] border-[#B45309]/30 bg-[#B45309]/5' },
  'out-of-stock': { label: 'Sold Out', classes: 'text-sale border-sale/30 bg-sale/5' },
  'sold-out': { label: 'Sold Out', classes: 'text-sale border-sale/30 bg-sale/5' },
}

/** Reuses the same stock-state thresholds as the dashboard's low-stock list
 *  (components/admin/LowStockList.tsx) — "low stock" never means something
 *  different from one admin screen to the next. */
export function ProductStockBadge({ totalStock, stockState }: ProductStockBadgeProps) {
  const { label, classes } = CONFIG[stockState]
  return (
    <span className={['inline-flex items-center text-xs font-sans font-semibold px-2 py-1 rounded-sm border', classes].join(' ')}>
      {label === 'Sold Out' ? label : `${label} · ${totalStock}`}
    </span>
  )
}
