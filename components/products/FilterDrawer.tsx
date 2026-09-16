'use client'

import React, { useEffect, useRef } from 'react'
import { FilterPanel } from '@/components/products/FilterPanel'
import type { FilterResult } from '@/lib/product-filters'

interface ActiveFilters {
  category?: string
  subcategory?: string
  badge?: string
  size?: string
  color?: string
  minPrice?: number
  maxPrice?: number
}

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  facets: FilterResult['facets']
  activeFilters: ActiveFilters
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

export function FilterDrawer({ isOpen, onClose, facets, activeFilters }: FilterDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Auto-focus close button for screen readers
      const t = setTimeout(() => closeRef.current?.focus(), 80)
      return () => {
        clearTimeout(t)
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Active filter count for the "Apply" button label
  const activeCount = [
    activeFilters.category && activeFilters.category !== 'all' ? 1 : 0,
    activeFilters.subcategory ? 1 : 0,
    activeFilters.badge ? 1 : 0,
    activeFilters.size ? activeFilters.size.split(',').length : 0,
    activeFilters.color ? activeFilters.color.split(',').length : 0,
    activeFilters.minPrice || activeFilters.maxPrice ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from the left */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Product filters"
        className={[
          'fixed top-0 left-0 z-50 h-full w-[min(340px,90vw)] bg-white shadow-2xl lg:hidden',
          'flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-[11px] font-sans font-semibold tracking-[0.16em] uppercase text-text-primary">
            Filters
            {activeCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-text-primary text-white text-[10px] font-bold rounded-full">
                {activeCount}
              </span>
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filter panel"
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <XIcon />
          </button>
        </div>

        {/* ── Scrollable filter content ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <FilterPanel
            facets={facets}
            activeFilters={activeFilters}
            onFilterChange={onClose}
          />
        </div>

        {/* ── Footer — Apply button ── */}
        <div className="shrink-0 px-5 py-4 border-t border-border bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 bg-text-primary text-white text-[11px] font-sans font-semibold tracking-[0.14em] uppercase hover:bg-[#2a2a2a] active:bg-[#333] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset rounded-sm"
          >
            {activeCount > 0 ? `Apply Filters (${activeCount})` : 'View All Products'}
          </button>
        </div>
      </div>
    </>
  )
}
