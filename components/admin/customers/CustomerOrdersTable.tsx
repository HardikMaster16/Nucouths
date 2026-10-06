import React from 'react'
import Link from 'next/link'
import { EyeIcon, OrdersIcon } from '@/components/admin/icons'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import type { AdminCustomerOrderRow } from '@/lib/admin/customers'

interface CustomerOrdersTableProps {
  orders: AdminCustomerOrderRow[]
}

function EmptyOrdersState() {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <OrdersIcon className="w-5 h-5" />
      </div>
      <h3 className="font-display text-lg text-text-primary">No orders yet</h3>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        This customer hasn&apos;t placed an order yet.
      </p>
    </div>
  )
}

const iconLinkClasses =
  'relative inline-flex items-center justify-center w-7 h-7 rounded-sm text-text-primary bg-transparent hover:bg-surface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1'

/** Same "doesn't count as a sale" muting as components/admin/orders/
 *  OrdersTable.tsx's OrderTotal — a cancelled order stays visible but its
 *  total is de-emphasized rather than bold. */
function OrderTotal({ order }: { order: AdminCustomerOrderRow }) {
  return (
    <span className={order.countsAsSale ? 'text-text-primary font-medium' : 'text-text-secondary'}>
      {order.totalFormatted}
    </span>
  )
}

export function CustomerOrdersTable({ orders }: CustomerOrdersTableProps) {
  if (orders.length === 0) return <EmptyOrdersState />

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Order ID</th>
              <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">Date</th>
              <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Items</th>
              <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Total</th>
              <th scope="col" className="py-2 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide">Status</th>
              <th scope="col" className="py-2 pl-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.orderNumber} className="hover:bg-surface/40 transition-colors duration-100">
                <td className="py-2.5 pr-4 font-medium text-text-primary whitespace-nowrap">
                  <Link href={`/admin/orders/${order.orderNumber}`} className="hover:underline underline-offset-2">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-text-secondary whitespace-nowrap">{order.placedAtFormatted}</td>
                <td className="py-2.5 pr-4 text-text-primary text-right">{order.itemCount}</td>
                <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                  <OrderTotal order={order} />
                </td>
                <td className="py-2.5 pr-4 whitespace-nowrap">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="py-2.5 pl-4">
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
          <li key={order.orderNumber} className="py-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/admin/orders/${order.orderNumber}`}
                className="text-sm font-sans font-medium text-text-primary hover:underline underline-offset-2"
              >
                {order.orderNumber}
              </Link>
              <span className="text-sm font-sans">
                <OrderTotal order={order} />
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-sans text-text-secondary">
              <span>{order.placedAtFormatted}</span>
              <span>{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <OrderStatusBadge status={order.status} />
              <Link
                href={`/admin/orders/${order.orderNumber}`}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <EyeIcon className="w-3.5 h-3.5" /> View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
