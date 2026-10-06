'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { EyeIcon, PencilIcon, InventoryIcon } from '@/components/admin/icons'
import type { InventoryRow } from '@/lib/admin/inventory'
import type { StockState } from '@/lib/types'

interface InventoryTableProps {
  rows: InventoryRow[]
  totalRowCount: number
  onClearFilters: () => void
  onUpdateStock: (row: InventoryRow, newStock: number) => Promise<void>
}

const STOCK_STATUS_CONFIG: Record<StockState, { label: string; classes: string }> = {
  'in-stock': { label: 'In Stock', classes: 'text-[#2F7A4D] border-[#2F7A4D]/30 bg-[#2F7A4D]/5' },
  'low-stock': { label: 'Low Stock', classes: 'text-[#B45309] border-[#B45309]/30 bg-[#B45309]/5' },
  'sold-out': { label: 'Out of Stock', classes: 'text-sale border-sale/30 bg-sale/5' },
  'out-of-stock': { label: 'Out of Stock', classes: 'text-sale border-sale/30 bg-sale/5' },
}

function StockStatusBadge({ state }: { state: StockState }) {
  const { label, classes } = STOCK_STATUS_CONFIG[state]
  return (
    <span className={['inline-flex items-center text-xs font-sans font-semibold px-2 py-1 rounded-sm border', classes].join(' ')}>
      {label}
    </span>
  )
}

function EmptyInventoryState() {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <InventoryIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No inventory yet</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        Variants will show up here once products with stock are added to the catalog.
      </p>
    </div>
  )
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <InventoryIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No matching variants</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        No inventory rows match your search and filters. Try adjusting or clearing them.
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

/** Inline "click to edit" stock control — a small number input + save/cancel,
 *  not a modal, per the task's "small edit control" requirement. Owns its
 *  own pending/error state; the parent only hears about a successful save. */
function StockEditor({ row, onUpdateStock }: { row: InventoryRow; onUpdateStock: (row: InventoryRow, newStock: number) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(String(row.stock))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setValue(String(row.stock))
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Whole number, 0+')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onUpdateStock(row, parsed)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Edit stock for ${row.productName}, ${row.color} ${row.size}`}
        className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-text-primary hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded-sm px-1 -mx-1"
      >
        {row.stock}
        <PencilIcon className="w-3 h-3 text-text-secondary" />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          autoFocus
          value={value}
          disabled={isSaving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') cancelEdit()
          }}
          aria-label={`New stock for ${row.productName}, ${row.color} ${row.size}`}
          className="w-16 h-8 px-2 text-sm font-sans text-text-primary bg-white border border-text-primary rounded-sm focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Save stock"
          className="h-8 px-2 text-xs font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 disabled:opacity-60"
        >
          {isSaving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={isSaving}
          aria-label="Cancel"
          className="h-8 px-2 text-xs font-sans font-medium uppercase tracking-wide text-text-secondary hover:text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 disabled:opacity-60"
        >
          ✕
        </button>
      </div>
      {error && <p className="text-[11px] font-sans text-sale">{error}</p>}
    </div>
  )
}

function VariantLabel({ row }: { row: InventoryRow }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-full border border-border/80 shrink-0"
        style={{ backgroundColor: row.colorHex }}
        aria-hidden="true"
      />
      {row.color} / {row.size}
    </span>
  )
}

const iconLinkClasses =
  'relative inline-flex items-center justify-center w-7 h-7 rounded-sm text-text-primary bg-transparent hover:bg-surface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1'

export function InventoryTable({ rows, totalRowCount, onClearFilters, onUpdateStock }: InventoryTableProps) {
  if (totalRowCount === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <EmptyInventoryState />
      </div>
    )
  }

  if (rows.length === 0) {
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
              <th scope="col" className="py-3 pl-4 pr-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Product</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">SKU</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Variant</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Price</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Stock</th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Status</th>
              <th scope="col" className="py-3 pl-3 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.variantId} className="hover:bg-surface/40 transition-colors duration-100">
                <td className="py-2.5 pl-4 pr-3 max-w-[220px]">
                  <p className="font-medium text-text-primary truncate">{row.productName}</p>
                  <p className="text-xs text-text-secondary truncate">{row.categoryLabel}</p>
                </td>
                <td className="py-2.5 px-3 text-text-secondary font-mono text-[12px] whitespace-nowrap">{row.sku}</td>
                <td className="py-2.5 px-3 text-text-primary whitespace-nowrap">
                  <VariantLabel row={row} />
                </td>
                <td className="py-2.5 px-3 text-text-primary text-right whitespace-nowrap">{row.priceFormatted}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <StockEditor row={row} onUpdateStock={onUpdateStock} />
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <StockStatusBadge state={row.stockState} />
                </td>
                <td className="py-2.5 pl-3 pr-4">
                  <div className="flex items-center justify-end">
                    <Link
                      href={`/admin/products/${row.productId}`}
                      aria-label={`View ${row.productName}`}
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
        {rows.map((row) => (
          <li key={row.variantId} className="p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-sans font-medium text-text-primary truncate">{row.productName}</p>
                <p className="text-xs font-sans text-text-secondary mt-0.5 font-mono">{row.sku}</p>
              </div>
              <StockStatusBadge state={row.stockState} />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-sans text-text-secondary">
              <VariantLabel row={row} />
              <span className="text-text-primary font-medium">{row.priceFormatted}</span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/70 -mx-4 px-4 mt-1">
              <div className="flex items-center gap-1.5 text-xs font-sans text-text-secondary">
                Stock: <StockEditor row={row} onUpdateStock={onUpdateStock} />
              </div>
              <Link
                href={`/admin/products/${row.productId}`}
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
