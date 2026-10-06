import React from 'react'
import type { SalesByStatus } from '@/lib/admin/dashboard.db'
import { OrderStatusBadge } from './OrderStatusBadge'

interface SalesOverviewProps {
  rows: SalesByStatus[]
}

// A simple CSS-only bar breakdown — no charting library. Grouped by order
// status (the same real order data Recent Orders shows below) rather than a
// daily/monthly trend, since order volume doesn't yet have enough history
// to make a time series meaningful.
export function SalesOverview({ rows }: SalesOverviewProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm font-sans text-text-secondary py-6 text-center">
        No sales data yet.
      </p>
    )
  }

  const maxTotal = Math.max(...rows.map((r) => r.total), 1)

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <div key={row.status} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <OrderStatusBadge status={row.status} />
            <p className="text-xs font-sans text-text-secondary shrink-0">
              <span className="font-medium text-text-primary">{row.totalFormatted}</span>
              {' '}· {row.orderCount} {row.orderCount === 1 ? 'order' : 'orders'}
            </p>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-text-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.max((row.total / maxTotal) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
