'use client'

import React from 'react'
import { PencilIcon, TrashIcon, CategoriesIcon } from '@/components/admin/icons'
import { ProductStatusBadge } from '@/components/admin/products/ProductStatusBadge'
import type { TaxonomyKind, TaxonomyRow } from '@/lib/admin/taxonomy'

interface TaxonomyTableProps {
  kind: TaxonomyKind
  rows: TaxonomyRow[]
  totalCount: number
  onClearSearch: () => void
  onEdit: (row: TaxonomyRow) => void
  onRequestDelete: (row: TaxonomyRow) => void
}

const KIND_LABEL: Record<TaxonomyKind, string> = { category: 'category', collection: 'collection' }

function deleteDisabledReason(row: TaxonomyRow, kind: TaxonomyKind): string | undefined {
  if (row.productCount === 0) return undefined
  return `Still assigned to ${row.productCount} product${row.productCount === 1 ? '' : 's'} — reassign or remove them before deleting this ${KIND_LABEL[kind]}.`
}

function EmptyState({ kind }: { kind: TaxonomyKind }) {
  const label = kind === 'category' ? 'categories' : 'collections'
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <CategoriesIcon className="w-5 h-5" />
      </div>
      <h3 className="font-display text-lg text-text-primary">No {label} yet</h3>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        {kind === 'category'
          ? 'No product categories are set up yet. Add one to start organizing the catalog.'
          : 'No named collections are set up yet. Add one to start grouping products together.'}
      </p>
    </div>
  )
}

function NoResultsState({ kind, onClearSearch }: { kind: TaxonomyKind; onClearSearch: () => void }) {
  const label = kind === 'category' ? 'categories' : 'collections'
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <CategoriesIcon className="w-5 h-5" />
      </div>
      <h3 className="font-display text-lg text-text-primary">No matching {label}</h3>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        No {label} match your search. Try a different name or slug.
      </p>
      <button
        type="button"
        onClick={onClearSearch}
        className="mt-1 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        Clear Search
      </button>
    </div>
  )
}

const iconButtonClasses =
  'relative inline-flex items-center justify-center w-7 h-7 rounded-sm text-text-primary bg-transparent hover:bg-surface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'

export function TaxonomyTable({ kind, rows, totalCount, onClearSearch, onEdit, onRequestDelete }: TaxonomyTableProps) {
  if (totalCount === 0) return <EmptyState kind={kind} />
  if (rows.length === 0) return <NoResultsState kind={kind} onClearSearch={onClearSearch} />

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="py-2 pr-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Name</th>
              <th scope="col" className="py-2 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Slug</th>
              <th scope="col" className="py-2 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Products</th>
              <th scope="col" className="py-2 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Status</th>
              <th scope="col" className="py-2 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">Updated</th>
              <th scope="col" className="py-2 pl-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const blockedReason = deleteDisabledReason(row, kind)
              return (
                <tr key={row.id} className="hover:bg-surface/40 transition-colors duration-100">
                  <td className="py-2.5 pr-3 font-medium text-text-primary max-w-[220px] truncate">{row.name}</td>
                  <td className="py-2.5 px-3 text-text-secondary font-mono text-[12px]">{row.slug}</td>
                  <td className="py-2.5 px-3 text-text-primary text-right">{row.productCount}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <ProductStatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{row.updatedAtFormatted}</td>
                  <td className="py-2.5 pl-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => onEdit(row)}
                        className={iconButtonClasses}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${row.name}`}
                        title={blockedReason}
                        disabled={!!blockedReason}
                        onClick={() => onRequestDelete(row)}
                        className={`${iconButtonClasses} hover:text-sale`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards, not a squeezed table */}
      <ul className="md:hidden divide-y divide-border -mx-5 sm:-mx-6">
        {rows.map((row) => {
          const blockedReason = deleteDisabledReason(row, kind)
          return (
            <li key={row.id} className="px-5 sm:px-6 py-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-sans font-medium text-text-primary truncate">{row.name}</p>
                  <p className="text-xs font-sans text-text-secondary font-mono mt-0.5">{row.slug}</p>
                </div>
                <ProductStatusBadge status={row.status} />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-sans text-text-secondary">
                <span>{row.productCount} product{row.productCount === 1 ? '' : 's'}</span>
                <span>Updated {row.updatedAtFormatted}</span>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border/70 -mx-5 sm:-mx-6 px-5 sm:px-6 mt-1">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
                >
                  <PencilIcon className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  disabled={!!blockedReason}
                  title={blockedReason}
                  onClick={() => onRequestDelete(row)}
                  aria-label={`Delete ${row.name}`}
                  className="w-9 h-9 shrink-0 flex items-center justify-center text-text-secondary hover:text-sale bg-surface hover:bg-border rounded-sm transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-text-secondary"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              {blockedReason && (
                <p className="text-[11px] font-sans text-text-secondary">{blockedReason}</p>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
