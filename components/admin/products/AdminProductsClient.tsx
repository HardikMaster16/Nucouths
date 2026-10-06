'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ProductsToolbar } from './ProductsToolbar'
import type { StatusFilter, StockFilter, SortOption } from './ProductsToolbar'
import { ProductsTable } from './ProductsTable'
import { DeleteProductDialog } from './DeleteProductDialog'
import { CheckCircleIcon, AlertIcon } from '@/components/admin/icons'
import { deleteProductAction } from '@/lib/admin/products.actions'
import type { AdminProductRow } from '@/lib/admin/products'

interface CategoryOption {
  value: string
  label: string
}

interface AdminProductsClientProps {
  initialProducts: AdminProductRow[]
  categoryOptions: CategoryOption[]
}

export function AdminProductsClient({ initialProducts, categoryOptions }: AdminProductsClientProps) {
  const router = useRouter()

  const [rows, setRows] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [stock, setStock] = useState<StockFilter>('all')
  const [sort, setSort] = useState<SortOption>('updated-desc')

  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null)
  const [isDeleting, startDeleting] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Products are read live from Prisma on the server (see
  // app/admin/(dashboard)/products/page.tsx) — `rows` is seeded from that
  // render and only ever updated via CRUD actions below. This effect just
  // reads the Add/Edit Product forms' `?created=`/`?updated=` handoff for
  // the success banner.
  useEffect(() => {
    // Read the query param directly (rather than next/navigation's
    // useSearchParams) so this component never needs a Suspense boundary
    // for a one-time, read-once-on-mount value.
    const searchParams = new URLSearchParams(window.location.search)
    const created = searchParams.get('created')
    const updated = searchParams.get('updated')
    if (created) {
      setFeedback({ type: 'success', message: `“${created}” was added to the catalog.` })
      router.replace('/admin/products', { scroll: false })
    } else if (updated) {
      setFeedback({ type: 'success', message: `“${updated}” was updated.` })
      router.replace('/admin/products', { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only; router identity churns on replace()
  }, [])

  const hasActiveFilters =
    search.trim() !== '' || category !== 'all' || status !== 'all' || stock !== 'all'

  function clearFilters() {
    setSearch('')
    setCategory('all')
    setStatus('all')
    setStock('all')
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    let result = rows.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query) && !p.sku.toLowerCase().includes(query)) {
        return false
      }
      if (category !== 'all' && p.category !== category) return false
      if (status !== 'all' && p.status !== status) return false
      if (stock !== 'all') {
        const matchesInStock = stock === 'in-stock' && p.stockState === 'in-stock'
        const matchesLowStock = stock === 'low-stock' && p.stockState === 'low-stock'
        const matchesSoldOut = stock === 'sold-out' && (p.stockState === 'sold-out' || p.stockState === 'out-of-stock')
        if (!matchesInStock && !matchesLowStock && !matchesSoldOut) return false
      }
      return true
    })

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'stock-asc':
          return a.totalStock - b.totalStock
        case 'updated-desc':
        default:
          return b.updatedAt.localeCompare(a.updatedAt)
      }
    })

    return result
  }, [rows, search, category, status, stock, sort])

  function handleConfirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget

    startDeleting(async () => {
      try {
        await deleteProductAction(target.id)
        setRows((prev) => prev.filter((p) => p.id !== target.id))
        setDeleteTarget(null)
        setFeedback({ type: 'success', message: `“${target.name}” was deleted.` })
      } catch {
        setFeedback({ type: 'error', message: `Couldn't delete “${target.name}”. Please try again.` })
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
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

      <ProductsToolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categoryOptions={categoryOptions}
        status={status}
        onStatusChange={setStatus}
        stock={stock}
        onStockChange={setStock}
        sort={sort}
        onSortChange={setSort}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <p className="text-xs font-sans text-text-secondary" aria-live="polite">
        {filteredProducts.length} of {rows.length} products
      </p>

      <ProductsTable
        products={filteredProducts}
        totalCatalogCount={rows.length}
        onClearFilters={clearFilters}
        onRequestDelete={setDeleteTarget}
      />

      <DeleteProductDialog
        product={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
