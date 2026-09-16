'use client'

import React, { useState } from 'react'
import { fieldInputClass } from './FormField'
import { Button } from '@/components/ui/Button'

// No promo/discount backend exists yet. This is a real, working shell (its
// own state, validation, and accessible live-region feedback) that only
// needs a real lookup wired into handleApply once a promo system exists —
// it deliberately does not fabricate any working discount codes.
export function PromoCode() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const handleApply = () => {
    if (!code.trim()) {
      setMessage('Enter a promo code to apply.')
      return
    }
    setMessage('Promo codes aren’t available yet — check back soon.')
  }

  return (
    <div className="border-t border-border pt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="promo-code-panel"
        className="flex items-center justify-between w-full text-xs font-sans font-semibold tracking-[0.1em] uppercase text-text-primary hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        Have a promo code?
        <span
          aria-hidden="true"
          className={['transition-transform duration-200', open ? '-rotate-180' : ''].join(' ')}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div id="promo-code-panel" className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <label htmlFor="promo-code" className="sr-only">
              Promo code
            </label>
            <input
              id="promo-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setMessage(null)
              }}
              placeholder="Enter code"
              className={[fieldInputClass(false), 'flex-1'].join(' ')}
            />
            <Button type="button" variant="outline" size="md" onClick={handleApply}>
              Apply
            </Button>
          </div>
          {message && (
            <p role="status" aria-live="polite" className="text-[11px] font-sans text-text-secondary">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
