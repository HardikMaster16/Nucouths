'use client'

import React, { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { PriceRangeSlider } from '@/components/products/PriceRangeSlider'
import type { FilterResult } from '@/lib/product-filters'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveFilters {
  category?: string
  subcategory?: string
  badge?: string
  size?: string
  color?: string
  minPrice?: number
  maxPrice?: number
}

interface FilterPanelProps {
  facets: FilterResult['facets']
  activeFilters: ActiveFilters
  /** Called after every filter navigation — allows the mobile drawer to close */
  onFilterChange?: () => void
}

// ─── Small shared components ──────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase text-text-secondary mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-sans text-text-secondary tracking-wide mb-1.5">
      {children}
    </p>
  )
}

// ─── FilterPanel ─────────────────────────────────────────────────────────────

export function FilterPanel({ facets, activeFilters, onFilterChange }: FilterPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ── URL navigation helper ─────────────────────────────────────────────────

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      if ('category' in updates) next.delete('subcategory')
      router.push(`${pathname}?${next.toString()}`, { scroll: false })
      onFilterChange?.()
    },
    [router, pathname, searchParams, onFilterChange]
  )

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false })
    onFilterChange?.()
  }, [router, pathname, onFilterChange])

  // ── Size helpers ──────────────────────────────────────────────────────────

  const activeSizes = activeFilters.size ? activeFilters.size.split(',') : []

  function toggleSize(size: string) {
    const next = activeSizes.includes(size)
      ? activeSizes.filter((s) => s !== size)
      : [...activeSizes, size]
    navigate({ size: next.length > 0 ? next.join(',') : null })
  }

  // ── Color helpers ─────────────────────────────────────────────────────────

  const activeColors = activeFilters.color
    ? activeFilters.color.split(',').map((c) => c.toLowerCase())
    : []

  function toggleColor(colorName: string) {
    const lower = colorName.toLowerCase()
    const next = activeColors.includes(lower)
      ? activeColors.filter((c) => c !== lower)
      : [...activeColors, lower]
    navigate({ color: next.length > 0 ? next.join(',') : null })
  }

  // ── Price helpers ─────────────────────────────────────────────────────────

  function handlePriceCommit(min: number, max: number) {
    const updates: Record<string, string | null> = {}
    updates.minPrice = min > facets.priceRange.min ? String(min) : null
    updates.maxPrice = max < facets.priceRange.max ? String(max) : null
    navigate(updates)
  }

  // ── Active filter count ───────────────────────────────────────────────────

  const activeCount = [
    activeFilters.category && activeFilters.category !== 'all' ? 1 : 0,
    activeFilters.subcategory ? 1 : 0,
    activeFilters.badge ? 1 : 0,
    activeSizes.length,
    activeColors.length,
    activeFilters.minPrice || activeFilters.maxPrice ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-7">

      {/* ── Clear all ─────────────────────────────────────── */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start text-[11px] font-sans font-medium text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Clear all filters
          <span className="ml-1 text-text-primary">({activeCount})</span>
        </button>
      )}

      {/* ── Category ──────────────────────────────────────── */}
      <FilterSection title="Category">
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Filter by category">
          {facets.categories.map((cat) => {
            const isActive =
              (cat.value === 'all' && (!activeFilters.category || activeFilters.category === 'all')) ||
              cat.value === activeFilters.category
            return (
              <button
                key={cat.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => navigate({ category: cat.value === 'all' ? null : cat.value })}
                className={[
                  'flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-sm text-sm font-sans transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-text-primary text-white font-medium'
                    : 'text-text-primary hover:bg-surface',
                ].join(' ')}
              >
                <span>{cat.label}</span>
                <span className={['text-[11px]', isActive ? 'text-white/60' : 'text-text-secondary'].join(' ')}>
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      </FilterSection>

      {/* ── Subcategory ───────────────────────────────────── */}
      {activeFilters.category && activeFilters.category !== 'all' && facets.subcategories.length > 0 && (
        <FilterSection title="Type">
          <div className="flex flex-col gap-1" role="group" aria-label="Filter by type">
            {facets.subcategories.map((sub) => {
              const isActive = sub.value === activeFilters.subcategory
              return (
                <button
                  key={sub.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => navigate({ subcategory: isActive ? null : sub.value })}
                  className={[
                    'flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-sm text-sm font-sans transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                    isActive
                      ? 'text-text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={[
                        'w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors duration-150',
                        isActive ? 'bg-text-primary border-text-primary text-white' : 'border-border',
                      ].join(' ')}
                    >
                      {isActive && <CheckIcon />}
                    </span>
                    {sub.label}
                  </span>
                  <span className="text-[11px] text-text-secondary">{sub.count}</span>
                </button>
              )
            })}
          </div>
        </FilterSection>
      )}

      {/* ── Availability / Badges ─────────────────────────── */}
      {facets.badges.length > 0 && (
        <FilterSection title="Availability">
          <div className="flex flex-col gap-1" role="group" aria-label="Filter by availability">
            {facets.badges.map((b) => {
              const isActive = b.value === activeFilters.badge
              return (
                <button
                  key={b.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => navigate({ badge: isActive ? null : b.value })}
                  className={[
                    'flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-sm text-sm font-sans transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                    isActive
                      ? 'text-text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={[
                        'w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors duration-150',
                        isActive ? 'bg-text-primary border-text-primary text-white' : 'border-border',
                      ].join(' ')}
                    >
                      {isActive && <CheckIcon />}
                    </span>
                    {b.label}
                  </span>
                  <span className="text-[11px] text-text-secondary">{b.count}</span>
                </button>
              )
            })}
          </div>
        </FilterSection>
      )}

      {/* ── Size ──────────────────────────────────────────── */}
      {(facets.clothingSizes.length > 0 || facets.waistSizes.length > 0) && (
        <FilterSection title="Size">
          <div className="flex flex-col gap-4">
            {/* Clothing sizes */}
            {facets.clothingSizes.length > 0 && (
              <div>
                <SubLabel>Clothing</SubLabel>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by clothing size">
                  {facets.clothingSizes.map((size) => {
                    const isActive = activeSizes.includes(size)
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={isActive}
                        aria-label={`Clothing size ${size}${isActive ? ', selected' : ''}`}
                        onClick={() => toggleSize(size)}
                        className={[
                          'h-8 min-w-[2.25rem] px-2.5 flex items-center justify-center',
                          'text-[11px] font-sans font-medium border rounded-sm',
                          'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                          isActive
                            ? 'bg-text-primary border-text-primary text-white'
                            : 'bg-white border-border text-text-primary hover:border-text-secondary',
                        ].join(' ')}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Waist sizes */}
            {facets.waistSizes.length > 0 && (
              <div>
                <SubLabel>Waist (inches)</SubLabel>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by waist size">
                  {facets.waistSizes.map((size) => {
                    const isActive = activeSizes.includes(size)
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={isActive}
                        aria-label={`Waist size ${size}${isActive ? ', selected' : ''}`}
                        onClick={() => toggleSize(size)}
                        className={[
                          'h-8 min-w-[2.25rem] px-2.5 flex items-center justify-center',
                          'text-[11px] font-sans font-medium border rounded-sm',
                          'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                          isActive
                            ? 'bg-text-primary border-text-primary text-white'
                            : 'bg-white border-border text-text-primary hover:border-text-secondary',
                        ].join(' ')}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Clear sizes shortcut */}
            {activeSizes.length > 0 && (
              <button
                type="button"
                onClick={() => navigate({ size: null })}
                className="self-start text-[11px] font-sans text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
              >
                Clear sizes
              </button>
            )}
          </div>
        </FilterSection>
      )}

      {/* ── Colour ────────────────────────────────────────── */}
      {facets.colors.length > 0 && (
        <FilterSection title="Colour">
          <div
            className="flex flex-wrap gap-2.5"
            role="group"
            aria-label="Filter by colour"
          >
            {facets.colors.map((c) => {
              const isActive = activeColors.includes(c.name.toLowerCase())
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`${c.name}${isActive ? ', selected' : ''} — ${c.count} product${c.count !== 1 ? 's' : ''}`}
                  title={c.name}
                  onClick={() => toggleColor(c.name)}
                  className={[
                    'relative w-7 h-7 rounded-full border-2 transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2',
                    isActive
                      ? 'border-text-primary scale-110 shadow-sm'
                      : 'border-transparent hover:border-text-secondary/40 hover:scale-105',
                  ].join(' ')}
                  style={{ backgroundColor: c.hex }}
                >
                  {/* Check mark for very light/white swatches */}
                  {isActive && (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <svg
                        width="9" height="9" viewBox="0 0 24 24" fill="none"
                        stroke={isLightColor(c.hex) ? '#111111' : '#ffffff'}
                        strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active colour labels */}
          {activeColors.length > 0 && (
            <p className="mt-2 text-[11px] font-sans text-text-secondary">
              {facets.colors
                .filter((c) => activeColors.includes(c.name.toLowerCase()))
                .map((c) => c.name)
                .join(', ')}
              {' · '}
              <button
                type="button"
                onClick={() => navigate({ color: null })}
                className="underline underline-offset-2 hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
              >
                Clear
              </button>
            </p>
          )}
        </FilterSection>
      )}

      {/* ── Price Range ───────────────────────────────────── */}
      <FilterSection title="Price Range">
        <PriceRangeSlider
          globalMin={facets.priceRange.min}
          globalMax={facets.priceRange.max}
          currentMin={activeFilters.minPrice ?? facets.priceRange.min}
          currentMax={activeFilters.maxPrice ?? facets.priceRange.max}
          step={500}
          onCommit={handlePriceCommit}
        />
      </FilterSection>

    </div>
  )
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Returns true if the hex colour is perceived as light (needs dark check) */
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // Perceived luminance
  return (r * 299 + g * 587 + b * 114) / 1000 > 186
}
