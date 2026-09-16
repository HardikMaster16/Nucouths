'use client'

import React from 'react'

interface AddToBagButtonProps {
  selectedColor: string | null
  selectedSize: string | null
  hasSizes: boolean
  stockState: 'in-stock' | 'low-stock' | 'out-of-stock' | 'sold-out' | null
  onAdd: () => void
}

export function AddToBagButton({
  selectedColor,
  selectedSize,
  hasSizes,
  stockState,
  onAdd,
}: AddToBagButtonProps) {
  // Determine button state and label
  let label = 'Add to Bag'
  let disabled = false
  let hint: string | null = null

  if (!selectedColor) {
    label = 'Select a Colour'
    disabled = true
    hint = 'Please select a colour to continue.'
  } else if (stockState === 'sold-out' || stockState === 'out-of-stock') {
    // Checked before size selection so a product that's sold out entirely
    // (no size can ever be picked) doesn't get stuck showing "Select a Size".
    label = 'Sold Out'
    disabled = true
    hint = 'This combination is currently unavailable.'
  } else if (hasSizes && !selectedSize) {
    label = 'Select a Size'
    disabled = true
    hint = 'Please select a size to continue.'
  } else if (stockState === 'low-stock') {
    label = 'Add to Bag'
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        aria-label={label}
        aria-describedby={hint ? 'add-to-bag-hint' : undefined}
        className={[
          'w-full h-12 flex items-center justify-center',
          'text-[12px] font-sans font-semibold tracking-[0.14em] uppercase',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2',
          disabled
            ? 'bg-border text-text-secondary cursor-not-allowed'
            : 'bg-text-primary text-white hover:bg-[#2a2a2a] active:bg-[#333]',
        ].join(' ')}
      >
        {label}
      </button>
      {hint && (
        <p
          id="add-to-bag-hint"
          className="text-[11px] font-sans text-text-secondary text-center"
          role="alert"
          aria-live="polite"
        >
          {hint}
        </p>
      )}
    </div>
  )
}
