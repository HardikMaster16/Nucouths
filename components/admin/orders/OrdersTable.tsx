'use client'

import React from 'react'
import Link from 'next/link'
import { EyeIcon, OrdersIcon } from '@/components/admin/icons'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import type { AdminOrderRow } from '@/lib/admin/orders'

interface OrdersTableProps {
  orders: AdminOrderRow[]
  totalOrderCount: number
  onClearFilters: () => void
}

function EmptyOrdersState() {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <OrdersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No orders yet</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        Orders placed at checkout will show up here once customers start buying.
      </p>
    </div>
  )
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <OrdersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No matching orders</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        No orders match your search and filters. Try adjusting or clearing them.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-1 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        Clear Filters
      </button>
    </div>
  )
}

const iconLinkClasses =
  'relative inline-flex items-center justify-center w-7 h-7 rounded-sm text-text-primary bg-transparent hover:bg-surface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1'

/** A cancelled order stays visible (never removed from the list) but its
 *  total is muted rather than bold/primary — the same "doesn't count as a
 *  sale" rule lib/admin/dashboard.ts's isRevenueOrder applies to KPIs, made
 *  visible here without a second definition of what counts. */
function OrderTotal({ order }: { order: AdminOrderRow }) {
  return (
    <span className={order.countsAsSale ? 'text-text-primary font-medium' : 'text-text-secondary'}>
      {order.totalFormatted}
    </span>
  )
}

export function OrdersTable({ orders, totalOrderCount, onClearFilters }: OrdersTableProps) {
  if (totalOrderCount === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <EmptyOrdersState />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <NoResultsState onClearFilters={onClearFilters} />
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-sm overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border text-left bg-surface/60">
              <th scope="col" className="py-3 pl-4 pr-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">
                Order ID
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Customer
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">
                Date
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Items
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Total
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Payment
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Status
              </th>
              <th scope="col" className="py-3 pl-3 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.orderNumber} className="hover:bg-surface/40 transition-colors duration-100">
                <td className="py-2.5 pl-4 pr-3 font-medium text-text-primary whitespace-nowrap">
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="hover:underline underline-offset-2"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-2.5 px-3 max-w-[200px]">
                  <p className="text-text-primary truncate">{order.customerName}</p>
                  <p className="text-xs text-text-secondary truncate">{order.customerEmail}</p>
                </td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{order.placedAtFormatted}</td>
                <td className="py-2.5 px-3 text-text-primary text-right">{order.itemCount}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <OrderTotal order={order} />
                </td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{order.paymentMethodLabel}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="py-2.5 pl-3 pr-4">
                  <div className="flex items-center justify-end">
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      aria-label={`View order ${order.orderNumber}`}
                      className={iconLinkClasses}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards, not a squeezed table */}
      <ul className="md:hidden divide-y divide-border">
        {orders.map((order) => (
          <li key={order.orderNumber} className="p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/orders/${order.orderNumber}`}
                  className="block text-sm font-sans font-medium text-text-primary hover:underline underline-offset-2"
                >
                  {order.orderNumber}
                </Link>
                <p className="text-xs font-sans text-text-secondary mt-0.5 truncate">{order.customerName}</p>
              </div>
              <span className="text-sm font-sans shrink-0">
                <OrderTotal order={order} />
              </span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-sans text-text-secondary">
              <span>{order.placedAtFormatted}</span>
              <span>{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</span>
              <span>{order.paymentMethodLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/70 -mx-4 px-4 mt-1">
              <OrderStatusBadge status={order.status} />
              <Link
                href={`/admin/orders/${order.orderNumber}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <EyeIcon className="w-3.5 h-3.5" /> View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
