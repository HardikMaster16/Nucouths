'use client'

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SORT_OPTIONS } from '@/lib/product-filters'
import type { SortOption } from '@/lib/product-filters'

interface SortBarProps {
  activeSort?: string
  activeFilterCount: number
  onOpenFilters: () => void
}

function SlidersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function SortBar({ activeSort, activeFilterCount, onOpenFilters }: SortBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleSort(value: SortOption) {
    const next = new URLSearchParams(searchParams.toString())
    if (value === 'featured') {
      next.delete('sort')
    } else {
      next.set('sort', value)
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }

  const currentSort = (activeSort as SortOption) ?? 'featured'

  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-border">
      {/* Mobile — Filter button (hidden on lg+) */}
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={`Open filters${activeFilterCount > 0 ? ` — ${activeFilterCount} active` : ''}`}
        className="lg:hidden relative inline-flex items-center gap-2 h-9 px-3.5 border border-border text-[11px] font-sans font-medium tracking-wider uppercase text-text-primary hover:border-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded-sm"
      >
        <SlidersIcon />
        Filter
        {activeFilterCount > 0 && (
          <span
            className="min-w-[18px] h-[18px] px-1 bg-text-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
            aria-hidden="true"
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Spacer (desktop — pushes sort to the right) */}
      <div className="hidden lg:block flex-1" />

      {/* Sort dropdown — always visible */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-xs font-sans text-text-secondary tracking-wide shrink-0 hidden sm:block">
          Sort by
        </label>
        <div className="relative">
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => handleSort(e.target.value as SortOption)}
            aria-label="Sort products"
            className="appearance-none h-9 pl-3 pr-8 border border-border bg-white text-[12px] font-sans text-text-primary cursor-pointer hover:border-text-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-0 rounded-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary">
            <ChevronDownIcon />
          </span>
        </div>
      </div>
    </div>
  )
}
