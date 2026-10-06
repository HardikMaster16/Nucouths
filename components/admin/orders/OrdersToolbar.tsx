'use client'

import React from 'react'
import { SearchIcon, ChevronDownIcon, XIcon } from '@/components/admin/icons'
import { PAYMENT_METHOD_LABELS } from '@/lib/order-storage'
import { ALL_ORDER_STATUSES, ALL_PAYMENT_METHODS } from '@/lib/admin/orders'
import type { OrderStatus, PaymentMethod } from '@/lib/types'

export type OrderStatusFilter = 'all' | OrderStatus
export type PaymentFilter = 'all' | PaymentMethod
export type DateRangeFilter = 'all' | '7d' | '30d' | '90d'

export const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  all: 'All Time',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
}

interface OrdersToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  status: OrderStatusFilter
  onStatusChange: (value: OrderStatusFilter) => void
  payment: PaymentFilter
  onPaymentChange: (value: PaymentFilter) => void
  dateRange: DateRangeFilter
  onDateRangeChange: (value: DateRangeFilter) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

const selectClasses =
  'h-10 pl-3 pr-8 text-sm font-sans text-text-primary bg-white border border-border rounded-sm appearance-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary cursor-pointer'

function Select({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  ariaLabel: string
}) {
  return (
    <div className="relative shrink-0">
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className={selectClasses}>
        {children}
      </select>
      <ChevronDownIcon className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
    </div>
  )
}

export function OrdersToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  payment,
  onPaymentChange,
  dateRange,
  onDateRangeChange,
  hasActiveFilters,
  onClearFilters,
}: OrdersToolbarProps) {
  return (
    <div className="bg-white border border-border rounded-sm p-4 flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
        <input
          type="text"
          inputMode="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by order ID or customer name…"
          aria-label="Search orders by order ID or customer name"
          className="w-full h-10 pl-9 pr-9 text-sm font-sans text-text-primary bg-white border border-border rounded-sm placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Select ariaLabel="Filter by status" value={status} onChange={(v) => onStatusChange(v as OrderStatusFilter)}>
          <option value="all">All Statuses</option>
          {ALL_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select ariaLabel="Filter by payment method" value={payment} onChange={(v) => onPaymentChange(v as PaymentFilter)}>
          <option value="all">All Payment Methods</option>
          {ALL_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </Select>

        <Select ariaLabel="Filter by date placed" value={dateRange} onChange={(v) => onDateRangeChange(v as DateRangeFilter)}>
          {(Object.keys(DATE_RANGE_LABELS) as DateRangeFilter[]).map((key) => (
            <option key={key} value={key}>
              {DATE_RANGE_LABELS[key]}
            </option>
          ))}
        </Select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-10 px-3 text-xs font-sans font-medium uppercase tracking-wide text-text-secondary hover:text-text-primary underline underline-offset-4 hover:no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded-sm shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}
