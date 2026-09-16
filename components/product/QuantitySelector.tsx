'use client'

import React from 'react'

interface QuantitySelectorProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
}

export function QuantitySelector({ value, min = 1, max, onChange }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-0 border border-border rounded-sm w-fit">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={[
          'w-10 h-10 flex items-center justify-center text-text-primary',
          'hover:bg-surface transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-primary',
          'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          'rounded-l-sm',
        ].join(' ')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div
        className="w-10 h-10 flex items-center justify-center text-sm font-sans font-medium text-text-primary border-l border-r border-border select-none"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Quantity: ${value}`}
      >
        {value}
      </div>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={[
          'w-10 h-10 flex items-center justify-center text-text-primary',
          'hover:bg-surface transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-primary',
          'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          'rounded-r-sm',
        ].join(' ')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
