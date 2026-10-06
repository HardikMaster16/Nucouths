'use client'

import React from 'react'
import { SearchIcon, ChevronDownIcon, XIcon } from '@/components/admin/icons'

export type StockStatusFilter = 'all' | 'in-stock' | 'low-stock' | 'sold-out'
export type InventorySortOption = 'stock-asc' | 'stock-desc' | 'name-asc'

interface CategoryOption {
  value: string
  label: string
}

interface InventoryToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  stockStatus: StockStatusFilter
  onStockStatusChange: (value: StockStatusFilter) => void
  category: string
  onCategoryChange: (value: string) => void
  categoryOptions: CategoryOption[]
  sort: InventorySortOption
  onSortChange: (value: InventorySortOption) => void
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

export function InventoryToolbar({
  search,
  onSearchChange,
  stockStatus,
  onStockStatusChange,
  category,
  onCategoryChange,
  categoryOptions,
  sort,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
}: InventoryToolbarProps) {
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
          placeholder="Search by product name or SKU…"
          aria-label="Search inventory by product name or SKU"
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
        <Select ariaLabel="Filter by stock status" value={stockStatus} onChange={(v) => onStockStatusChange(v as StockStatusFilter)}>
          <option value="all">All Stock</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="sold-out">Out of Stock</option>
        </Select>

        <Select ariaLabel="Filter by category" value={category} onChange={onCategoryChange}>
          <option value="all">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>

        <Select ariaLabel="Sort inventory" value={sort} onChange={(v) => onSortChange(v as InventorySortOption)}>
          <option value="stock-asc">Stock: Low to High</option>
          <option value="stock-desc">Stock: High to Low</option>
          <option value="name-asc">Product Name: A–Z</option>
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
