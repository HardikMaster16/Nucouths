'use client'

import React from 'react'
import { SearchIcon, ChevronDownIcon, XIcon } from '@/components/admin/icons'
import type { CouponStatus } from '@/lib/admin/coupons'

export type CouponStatusFilter = 'all' | CouponStatus

interface CouponsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  status: CouponStatusFilter
  onStatusChange: (value: CouponStatusFilter) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function CouponsToolbar({ search, onSearchChange, status, onStatusChange, hasActiveFilters, onClearFilters }: CouponsToolbarProps) {
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
          placeholder="Search by coupon code…"
          aria-label="Search coupons by code"
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
        <div className="relative shrink-0">
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as CouponStatusFilter)}
            className="h-10 pl-3 pr-8 text-sm font-sans text-text-primary bg-white border border-border rounded-sm appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
            <option value="Disabled">Disabled</option>
          </select>
          <ChevronDownIcon className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        </div>

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
