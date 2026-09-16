'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { ProductGrid } from '@/components/products/ProductGrid'
import { SortBar } from '@/components/products/SortBar'
import { FilterPanel } from '@/components/products/FilterPanel'
import { FilterDrawer } from '@/components/products/FilterDrawer'
import type { FilterResult } from '@/lib/product-filters'

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 8

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveFilters {
  category?: string
  subcategory?: string
  sort?: string
  badge?: string
  size?: string
  color?: string
  minPrice?: number
  maxPrice?: number
}

interface ProductsShellProps {
  result: FilterResult
  activeFilters: ActiveFilters
}

// ─── Active Filter Chips ──────────────────────────────────────────────────────

function ActiveFilterChips({ activeFilters, facets }: {
  activeFilters: ActiveFilters
  facets: FilterResult['facets']
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function remove(key: string, value?: string) {
    const next = new URLSearchParams(searchParams.toString())

    if ((key === 'size' || key === 'color') && value) {
      const current = (key === 'size' ? activeFilters.size : activeFilters.color) ?? ''
      const remaining = current.split(',').filter((s) => s.toLowerCase() !== value.toLowerCase())
      if (remaining.length > 0) {
        next.set(key, remaining.join(','))
      } else {
        next.delete(key)
      }
    } else {
      next.delete(key)
    }
    if (key === 'category') next.delete('subcategory')
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }

  // Build chip list
  type Chip = { key: string; label: string; value?: string; onRemove: () => void }
  const chips: Chip[] = []

  if (activeFilters.category && activeFilters.category !== 'all') {
    const label = activeFilters.category === 'men' ? 'Men' : 'Women'
    chips.push({ key: 'category', label, onRemove: () => remove('category') })
  }
  if (activeFilters.subcategory) {
    const label = activeFilters.subcategory.charAt(0).toUpperCase() + activeFilters.subcategory.slice(1)
    chips.push({ key: 'subcategory', label, onRemove: () => remove('subcategory') })
  }
  if (activeFilters.badge) {
    const labels: Record<string, string> = { NEW: 'New In', SALE: 'On Sale', LIMITED: 'Limited' }
    chips.push({ key: 'badge', label: labels[activeFilters.badge] ?? activeFilters.badge, onRemove: () => remove('badge') })
  }
  if (activeFilters.size) {
    activeFilters.size.split(',').forEach((s) => {
      chips.push({ key: 'size', value: s, label: `Size ${s}`, onRemove: () => remove('size', s) })
    })
  }
  if (activeFilters.color) {
    activeFilters.color.split(',').forEach((c) => {
      // Find proper-cased name from facets
      const match = facets.colors.find((fc) => fc.name.toLowerCase() === c.toLowerCase())
      const label = match?.name ?? c
      chips.push({ key: 'color', value: c, label, onRemove: () => remove('color', c) })
    })
  }
  if (activeFilters.minPrice || activeFilters.maxPrice) {
    const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`
    const min = activeFilters.minPrice ?? facets.priceRange.min
    const max = activeFilters.maxPrice ?? facets.priceRange.max
    chips.push({
      key: 'price',
      label: `${fmt(min)} – ${fmt(max)}`,
      onRemove: () => {
        const next = new URLSearchParams(searchParams.toString())
        next.delete('minPrice')
        next.delete('maxPrice')
        router.push(`${pathname}?${next.toString()}`, { scroll: false })
      },
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-border">
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value ?? chip.label}`}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 border border-border rounded-sm text-[11px] font-sans font-medium text-text-primary hover:border-text-secondary hover:bg-surface transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          {chip.label}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => router.push(pathname, { scroll: false })}
          className="text-[11px] font-sans text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <svg
        width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1"
        strokeLinecap="round" strokeLinejoin="round"
        className="text-border mb-6" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <h2 className="font-display text-2xl text-text-primary mb-2">No products found</h2>
      <p className="text-sm font-sans text-text-secondary mb-8 max-w-xs">
        No products match your current selection. Try adjusting or clearing your filters.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center justify-center h-10 px-6 bg-text-primary text-white text-[11px] font-sans font-semibold tracking-[0.12em] uppercase hover:bg-[#2a2a2a] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2"
      >
        Clear All Filters
      </button>
    </div>
  )
}

// ─── Load More ────────────────────────────────────────────────────────────────

function LoadMoreButton({ shown, total, onLoadMore }: {
  shown: number
  total: number
  onLoadMore: () => void
}) {
  const remaining = total - shown
  if (remaining <= 0) return null

  return (
    <div className="flex flex-col items-center gap-3 pt-10">
      <p className="text-xs font-sans text-text-secondary">
        Showing <span className="font-medium text-text-primary">{shown}</span> of{' '}
        <span className="font-medium text-text-primary">{total}</span> products
      </p>
      <div className="w-32 h-px bg-border relative overflow-hidden rounded-full">
        <div
          className="absolute top-0 left-0 h-full bg-text-primary transition-all duration-500"
          style={{ width: `${(shown / total) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        onClick={onLoadMore}
        className="mt-1 inline-flex items-center justify-center h-11 px-8 border border-text-primary text-[11px] font-sans font-semibold tracking-[0.12em] uppercase text-text-primary hover:bg-text-primary hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 rounded-sm"
      >
        Load {Math.min(remaining, PER_PAGE)} More
      </button>
    </div>
  )
}

// ─── ProductsShell ────────────────────────────────────────────────────────────

export function ProductsShell({ result, activeFilters }: ProductsShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [displayCount, setDisplayCount] = useState(PER_PAGE)

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(PER_PAGE)
  }, [
    result.total,
    activeFilters.category,
    activeFilters.badge,
    activeFilters.size,
    activeFilters.color,
    activeFilters.subcategory,
    activeFilters.minPrice,
    activeFilters.maxPrice,
  ])

  const handleClearAll = useCallback(() => {
    router.push(pathname, { scroll: false })
  }, [router, pathname])

  const visibleProducts = result.products.slice(0, displayCount)

  // Count for mobile filter badge
  const activeFilterCount = [
    activeFilters.category && activeFilters.category !== 'all' ? 1 : 0,
    activeFilters.subcategory ? 1 : 0,
    activeFilters.badge ? 1 : 0,
    activeFilters.size ? activeFilters.size.split(',').length : 0,
    activeFilters.color ? activeFilters.color.split(',').length : 0,
    activeFilters.minPrice || activeFilters.maxPrice ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <Container className="py-6 sm:py-8">
      <div className="flex gap-8 lg:gap-10 items-start">

        {/* ── Desktop sidebar (hidden on mobile/tablet) ─────── */}
        <aside
          aria-label="Product filters"
          className={[
            'hidden lg:block shrink-0 sticky self-start',
            'w-56 xl:w-64',
            // Header is h-[60px] sticky; add 12px gap = 72px
            'top-[72px]',
            // Allow internal scroll when filter list exceeds viewport height,
            // but hide the native scrollbar so there's no visible secondary scroll track
            'max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar',
          ].join(' ')}
        >
          <p className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase text-text-secondary mb-4">
            Filters
          </p>
          <FilterPanel facets={result.facets} activeFilters={activeFilters} />
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Sort bar (no count — count lives in page header) */}
          <SortBar
            activeSort={activeFilters.sort}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setDrawerOpen(true)}
          />

          {/* Active filter chips */}
          <ActiveFilterChips activeFilters={activeFilters} facets={result.facets} />

          {/* Grid or empty state */}
          {result.total === 0 ? (
            <EmptyState onClear={handleClearAll} />
          ) : (
            <>
              <div className="pt-6">
                <ProductGrid
                  products={visibleProducts}
                  columns={4}
                  priorityCount={4}
                />
              </div>
              <LoadMoreButton
                shown={Math.min(displayCount, result.total)}
                total={result.total}
                onLoadMore={() => setDisplayCount((c) => c + PER_PAGE)}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <FilterDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        facets={result.facets}
        activeFilters={activeFilters}
      />
    </Container>
  )
}
