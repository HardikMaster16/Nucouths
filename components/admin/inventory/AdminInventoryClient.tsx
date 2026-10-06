'use client'

import React, { useMemo, useState } from 'react'
import { updateVariantStockInDb } from '@/lib/admin/inventory.actions'
import type { InventoryRow } from '@/lib/admin/inventory'
import { CheckCircleIcon, AlertIcon } from '@/components/admin/icons'
import { InventoryToolbar } from './InventoryToolbar'
import type { StockStatusFilter, InventorySortOption } from './InventoryToolbar'
import { InventoryTable } from './InventoryTable'

interface CategoryOption {
  value: string
  label: string
}

interface AdminInventoryClientProps {
  initialRows: InventoryRow[]
  categoryOptions: CategoryOption[]
}

type Feedback = { type: 'success' | 'error'; message: string } | null

export function AdminInventoryClient({ initialRows, categoryOptions }: AdminInventoryClientProps) {
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState('')
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<InventorySortOption>('stock-asc')
  const [feedback, setFeedback] = useState<Feedback>(null)

  const productCount = useMemo(() => new Set(rows.map((r) => r.productId)).size, [rows])
  const lowStockCount = useMemo(() => rows.filter((r) => r.stockState === 'low-stock').length, [rows])

  const hasActiveFilters = search.trim() !== '' || stockStatus !== 'all' || category !== 'all' || sort !== 'stock-asc'

  function clearFilters() {
    setSearch('')
    setStockStatus('all')
    setCategory('all')
    setSort('stock-asc')
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    let result = rows.filter((row) => {
      if (query && !row.productName.toLowerCase().includes(query) && !row.sku.toLowerCase().includes(query)) {
        return false
      }
      if (stockStatus !== 'all') {
        const matchesSoldOut = stockStatus === 'sold-out' && (row.stockState === 'sold-out' || row.stockState === 'out-of-stock')
        if (!matchesSoldOut && row.stockState !== stockStatus) return false
      }
      if (category !== 'all' && row.category !== category) return false
      return true
    })

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'stock-desc':
          return b.stock - a.stock
        case 'name-asc':
          return a.productName.localeCompare(b.productName)
        case 'stock-asc':
        default:
          return a.stock - b.stock
      }
    })

    return result
  }, [rows, search, stockStatus, category, sort])

  async function handleUpdateStock(row: InventoryRow, newStock: number) {
    // variantId alone identifies the row server-side — see
    // lib/admin/inventory.actions.ts for why row.productId is never sent as
    // an authorization input.
    const updated = await updateVariantStockInDb(row.variantId, newStock)
    setRows((prev) => prev.map((r) => (r.variantId === row.variantId ? updated : r)))
    setFeedback({ type: 'success', message: `Stock updated for ${row.productName} (${row.color} / ${row.size}).` })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-sans text-text-secondary">
        <span className="font-medium text-text-primary">{productCount}</span> products ·{' '}
        <span className="font-medium text-text-primary">{rows.length}</span> variants ·{' '}
        <span className="font-medium text-text-primary">{lowStockCount}</span> low stock
      </p>

      {feedback && (
        <div
          role="status"
          className={[
            'border rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans',
            feedback.type === 'success'
              ? 'bg-[#2F7A4D]/5 border-[#2F7A4D]/30 text-[#2F7A4D]'
              : 'bg-sale/5 border-sale/30 text-sale',
          ].join(' ')}
        >
          {feedback.type === 'success' ? (
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
          ) : (
            <AlertIcon className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 text-xs font-sans font-medium uppercase tracking-wide focus-visible:outline-none"
          >
            Dismiss
          </button>
        </div>
      )}

      <InventoryToolbar
        search={search}
        onSearchChange={setSearch}
        stockStatus={stockStatus}
        onStockStatusChange={setStockStatus}
        category={category}
        onCategoryChange={setCategory}
        categoryOptions={categoryOptions}
        sort={sort}
        onSortChange={setSort}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <p className="text-xs font-sans text-text-secondary" aria-live="polite">
        {filteredRows.length} of {rows.length} variants
      </p>

      <InventoryTable
        rows={filteredRows}
        totalRowCount={rows.length}
        onClearFilters={clearFilters}
        onUpdateStock={handleUpdateStock}
      />
    </div>
  )
}
