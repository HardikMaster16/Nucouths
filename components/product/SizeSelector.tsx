'use client'

import React from 'react'

const CLOTHING_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

function isClothingSize(s: string) {
  return CLOTHING_ORDER.includes(s)
}

function isOneSize(s: string) {
  return s === 'ONE SIZE' || s === 'ONE_SIZE'
}

interface SizeSelectorProps {
  /** All sizes available for this colour (may include out-of-stock) */
  sizes: string[]
  /** Sizes with stock > 0 for the selected colour */
  availableSizes: Set<string>
  selectedSize: string | null
  onSelect: (size: string) => void
  onSizeGuide: () => void
}

export function SizeSelector({
  sizes,
  availableSizes,
  selectedSize,
  onSelect,
  onSizeGuide,
}: SizeSelectorProps) {
  if (sizes.length === 0) return null

  // Split into clothing / waist / one-size
  const clothingSizes = sizes.filter((s) => isClothingSize(s))
  const waistSizes = sizes.filter((s) => !isClothingSize(s) && !isOneSize(s))
  const hasOneSize = sizes.some(isOneSize)

  function SizeButton({ size }: { size: string }) {
    const isAvail = availableSizes.has(size)
    const isSelected = selectedSize === size
    return (
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={`Size ${size}${isSelected ? ', selected' : ''}${!isAvail ? ', sold out' : ''}`}
        disabled={!isAvail}
        onClick={() => onSelect(size)}
        className={[
          'relative h-10 min-w-[2.75rem] px-3 flex items-center justify-center',
          'text-[12px] font-sans font-medium border rounded-sm',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
          isSelected && isAvail
            ? 'bg-text-primary border-text-primary text-white'
            : isAvail
            ? 'bg-white border-border text-text-primary hover:border-text-primary'
            : 'bg-white border-border text-text-secondary cursor-not-allowed opacity-50',
        ].join(' ')}
      >
        {size}
        {/* Diagonal strikethrough for sold-out sizes */}
        {!isAvail && (
          <span className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <svg width="100%" height="100%" className="absolute inset-0">
              <line x1="0" y1="100%" x2="100%" y2="0" stroke="#E5E5E5" strokeWidth="1" />
            </svg>
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Size guide link */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-sans font-semibold tracking-[0.14em] uppercase text-text-primary">
          Size
          {selectedSize && !isOneSize(selectedSize) ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-text-secondary">
              — {selectedSize}
            </span>
          ) : !hasOneSize ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-text-secondary">
              — Select a size
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onSizeGuide}
          className="text-[11px] font-sans text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Size Guide
        </button>
      </div>

      {/* Clothing sizes */}
      {clothingSizes.length > 0 && (
        <div>
          {waistSizes.length > 0 && (
            <p className="text-[10px] font-sans text-text-secondary tracking-wide mb-2">Clothing</p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Clothing sizes">
            {clothingSizes.map((s) => <SizeButton key={s} size={s} />)}
          </div>
        </div>
      )}

      {/* Waist sizes */}
      {waistSizes.length > 0 && (
        <div>
          {clothingSizes.length > 0 && (
            <p className="text-[10px] font-sans text-text-secondary tracking-wide mb-2">Waist (inches)</p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Waist sizes">
            {waistSizes.map((s) => <SizeButton key={s} size={s} />)}
          </div>
        </div>
      )}

      {/* One-size */}
      {hasOneSize && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Size options">
          <SizeButton size="ONE SIZE" />
        </div>
      )}
    </div>
  )
}
