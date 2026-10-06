'use client'

import React, { useMemo, useState } from 'react'
import { OrdersToolbar } from './OrdersToolbar'
import type { OrderStatusFilter, PaymentFilter, DateRangeFilter } from './OrdersToolbar'
import { OrdersTable } from './OrdersTable'
import type { AdminOrderRow } from '@/lib/admin/orders'

interface AdminOrdersClientProps {
  initialOrders: AdminOrderRow[]
}

const DATE_RANGE_DAYS: Record<Exclude<DateRangeFilter, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const [orders] = useState(initialOrders)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatusFilter>('all')
  const [payment, setPayment] = useState<PaymentFilter>('all')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all')

  const hasActiveFilters =
    search.trim() !== '' || status !== 'all' || payment !== 'all' || dateRange !== 'all'

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setPayment('all')
    setDateRange('all')
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cutoff = dateRange === 'all' ? null : Date.now() - DATE_RANGE_DAYS[dateRange] * 24 * 60 * 60 * 1000

    return orders.filter((order) => {
      if (query && !order.orderNumber.toLowerCase().includes(query) && !order.customerName.toLowerCase().includes(query)) {
        return false
      }
      if (status !== 'all' && order.status !== status) return false
      if (payment !== 'all' && order.paymentMethod !== payment) return false
      if (cutoff !== null && new Date(order.placedAt).getTime() < cutoff) return false
      return true
    })
  }, [orders, search, status, payment, dateRange])

  return (
    <div className="flex flex-col gap-4">
      <OrdersToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        payment={payment}
        onPaymentChange={setPayment}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <p className="text-xs font-sans text-text-secondary" aria-live="polite">
        {filteredOrders.length} of {orders.length} orders
      </p>

      <OrdersTable orders={filteredOrders} totalOrderCount={orders.length} onClearFilters={clearFilters} />
    </div>
  )
}
