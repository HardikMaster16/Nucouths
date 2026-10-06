'use client'

import React, { useMemo, useState } from 'react'
import { deleteTaxonomyEntry, TaxonomyDeleteBlockedError } from '@/lib/admin/taxonomy'
import type { TaxonomyKind, TaxonomyRow } from '@/lib/admin/taxonomy'
import { SearchIcon, PlusIcon, XIcon, AlertIcon, CheckCircleIcon } from '@/components/admin/icons'
import { TaxonomyTable } from './TaxonomyTable'
import { TaxonomyFormModal } from './TaxonomyFormModal'
import { DeleteTaxonomyDialog } from './DeleteTaxonomyDialog'

interface AdminCategoriesClientProps {
  seedCategories: TaxonomyRow[]
  seedCollections: TaxonomyRow[]
}

type Feedback = { type: 'success' | 'error'; message: string } | null
type FormTarget = { kind: TaxonomyKind; row: TaxonomyRow | null }
type DeleteTarget = { kind: TaxonomyKind; row: TaxonomyRow }

const addButtonClasses =
  'inline-flex items-center gap-1.5 h-11 px-5 text-sm font-sans font-medium uppercase tracking-wide rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 shrink-0'

export function AdminCategoriesClient({ seedCategories, seedCollections }: AdminCategoriesClientProps) {
  const [categories, setCategories] = useState(seedCategories)
  const [collections, setCollections] = useState(seedCollections)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const query = search.trim().toLowerCase()
  const filteredCategories = useMemo(
    () => (query ? categories.filter((row) => row.name.toLowerCase().includes(query) || row.slug.toLowerCase().includes(query)) : categories),
    [categories, query]
  )
  const filteredCollections = useMemo(
    () => (query ? collections.filter((row) => row.name.toLowerCase().includes(query) || row.slug.toLowerCase().includes(query)) : collections),
    [collections, query]
  )

  function setRowsFor(kind: TaxonomyKind) {
    return kind === 'category' ? setCategories : setCollections
  }

  function handleSaved(kind: TaxonomyKind, row: TaxonomyRow, mode: 'create' | 'edit') {
    setRowsFor(kind)((prev) => (mode === 'create' ? [row, ...prev] : prev.map((r) => (r.id === row.id ? row : r))))
    setFeedback({ type: 'success', message: `“${row.name}” was ${mode === 'create' ? 'added' : 'updated'}.` })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const { kind, row } = deleteTarget

    setIsDeleting(true)
    try {
      await deleteTaxonomyEntry(kind, row)
      setRowsFor(kind)((prev) => prev.filter((r) => r.id !== row.id))
      setFeedback({ type: 'success', message: `“${row.name}” was deleted.` })
      setDeleteTarget(null)
    } catch (err) {
      const message =
        err instanceof TaxonomyDeleteBlockedError
          ? `Can't delete “${row.name}” — it's still assigned to ${err.productCount} product${err.productCount === 1 ? '' : 's'}.`
          : `Couldn't delete “${row.name}”. Please try again.`
      setFeedback({ type: 'error', message })
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
            Categories & Collections
          </h1>
          <p className="text-sm font-sans text-text-secondary mt-1 max-w-xl">
            Manage the categories and collections used to organize your products.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setFormTarget({ kind: 'category', row: null })}
            className={`${addButtonClasses} text-text-primary bg-surface hover:bg-border`}
          >
            <PlusIcon className="w-3.5 h-3.5" /> Add Category
          </button>
          <button
            type="button"
            onClick={() => setFormTarget({ kind: 'collection', row: null })}
            className={`${addButtonClasses} text-white bg-text-primary hover:bg-[#2a2a2a]`}
          >
            <PlusIcon className="w-3.5 h-3.5" /> Add Collection
          </button>
        </div>
      </div>

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

      {/* Search */}
      <div className="bg-white border border-border rounded-sm p-4">
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          <input
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories and collections by name or slug…"
            aria-label="Search categories and collections by name or slug"
            className="w-full h-10 pl-9 pr-9 text-sm font-sans text-text-primary bg-white border border-border rounded-sm placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-sans font-semibold text-text-primary">Categories</h2>
          <span className="text-xs font-sans text-text-secondary">
            {filteredCategories.length} of {categories.length}
          </span>
        </div>
        <TaxonomyTable
          kind="category"
          rows={filteredCategories}
          totalCount={categories.length}
          onClearSearch={() => setSearch('')}
          onEdit={(row) => setFormTarget({ kind: 'category', row })}
          onRequestDelete={(row) => setDeleteTarget({ kind: 'category', row })}
        />
      </section>

      {/* Collections */}
      <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-sans font-semibold text-text-primary">Collections</h2>
          <span className="text-xs font-sans text-text-secondary">
            {filteredCollections.length} of {collections.length}
          </span>
        </div>
        <TaxonomyTable
          kind="collection"
          rows={filteredCollections}
          totalCount={collections.length}
          onClearSearch={() => setSearch('')}
          onEdit={(row) => setFormTarget({ kind: 'collection', row })}
          onRequestDelete={(row) => setDeleteTarget({ kind: 'collection', row })}
        />
      </section>

      {formTarget && (
        <TaxonomyFormModal
          key={`${formTarget.kind}-${formTarget.row?.id ?? 'new'}`}
          kind={formTarget.kind}
          row={formTarget.row}
          onClose={() => setFormTarget(null)}
          onSaved={(row, mode) => handleSaved(formTarget.kind, row, mode)}
        />
      )}

      <DeleteTaxonomyDialog
        kind={deleteTarget?.kind ?? 'category'}
        row={deleteTarget?.row ?? null}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
