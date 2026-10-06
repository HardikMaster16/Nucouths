import React from 'react'
import Link from 'next/link'
import type { RecentOrderRow } from '@/lib/admin/dashboard.db'
import { OrderStatusBadge } from './OrderStatusBadge'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface RecentOrdersTableProps {
  orders: RecentOrderRow[]
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <p className="text-sm font-sans text-text-secondary py-10 text-center">
        No recent orders.
      </p>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="py-2.5 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Order</th>
              <th scope="col" className="py-2.5 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Customer</th>
              <th scope="col" className="py-2.5 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Date</th>
              <th scope="col" className="py-2.5 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Status</th>
              <th scope="col" className="py-2.5 pl-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.orderNumber}>
                <td className="py-3 pr-4 font-medium text-text-primary whitespace-nowrap">
                  {order.orderNumber}
                </td>
                <td className="py-3 pr-4 text-text-primary truncate max-w-[180px]">
                  {order.customerName}
                </td>
                <td className="py-3 pr-4 text-text-secondary whitespace-nowrap">
                  {formatDate(order.placedAt)}
                </td>
                <td className="py-3 pr-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="py-3 pl-4 text-text-primary font-medium text-right whitespace-nowrap">
                  {order.totalFormatted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards, not a squeezed table */}
      <ul className="md:hidden flex flex-col divide-y divide-border">
        {orders.map((order) => (
          <li key={order.orderNumber} className="py-3.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-sans font-medium text-text-primary">
                {order.orderNumber}
              </span>
              <span className="text-sm font-sans font-medium text-text-primary shrink-0">
                {order.totalFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-sans text-text-secondary truncate">
                {order.customerName}
              </span>
              <span className="text-xs font-sans text-text-secondary shrink-0">
                {formatDate(order.placedAt)}
              </span>
            </div>
            <OrderStatusBadge status={order.status} />
          </li>
        ))}
      </ul>

      <div className="pt-4 mt-1 border-t border-border">
        <Link
          href="/admin/orders"
          className="text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          View All Orders →
        </Link>
      </div>
    </>
  )
}
