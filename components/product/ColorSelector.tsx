'use client'

import React from 'react'

interface ColorSelectorProps {
  colors: Array<{ name: string; hex: string }>
  selectedColor: string | null
  onSelect: (name: string) => void
}

/** True if the hex colour is perceived as light — determines check icon colour */
function isLight(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 186
}

function CheckIcon({ dark }: { dark: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke={dark ? '#111111' : '#ffffff'}
      strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function ColorSelector({ colors, selectedColor, onSelect }: ColorSelectorProps) {
  return (
    <div>
      <p className="text-xs font-sans font-semibold tracking-[0.14em] uppercase text-text-primary mb-3">
        Colour
        {selectedColor && (
          <span className="ml-2 font-normal normal-case tracking-normal text-text-secondary">
            — {selectedColor}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Select colour">
        {colors.map((color) => {
          const isSelected = selectedColor === color.name
          const light = isLight(color.hex)
          return (
            <button
              key={color.name}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${color.name}${isSelected ? ' (selected)' : ''}`}
              title={color.name}
              onClick={() => onSelect(color.name)}
              className={[
                'relative w-8 h-8 rounded-full border-2 transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2',
                isSelected
                  ? 'border-text-primary scale-110'
                  : 'border-transparent hover:border-border hover:scale-105',
              ].join(' ')}
              style={{ backgroundColor: color.hex }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <CheckIcon dark={light} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
