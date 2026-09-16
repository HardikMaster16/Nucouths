'use client'

import React, { useState, useRef } from 'react'

interface DeliveryCheckerProps {
  /** Placeholder — connect to real delivery API later */
  onCheck?: (pincode: string) => void
}

export function DeliveryChecker({ onCheck }: DeliveryCheckerProps) {
  const [pincode, setPincode] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = pincode.trim()
    if (clean.length !== 6 || !/^\d+$/.test(clean)) {
      inputRef.current?.focus()
      return
    }
    // TODO: replace with real API call
    onCheck?.(clean)
    setSubmitted(true)
  }

  return (
    <div>
      <p className="text-xs font-sans font-semibold tracking-[0.14em] uppercase text-text-secondary mb-3">
        Check Delivery
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <div className="flex-1">
          <label htmlFor="pincode-input" className="sr-only">
            Enter your pincode
          </label>
          <input
            ref={inputRef}
            id="pincode-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={pincode}
            onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')); setSubmitted(false) }}
            placeholder="Enter pincode"
            aria-label="Enter your 6-digit pincode"
            className="w-full h-10 px-3 border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-0 transition-colors duration-150"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-4 text-[11px] font-sans font-semibold tracking-[0.12em] uppercase border border-text-primary text-text-primary hover:bg-text-primary hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1 shrink-0"
        >
          Check
        </button>
      </form>

      {/* Result area — replace with real API response */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-2.5 min-h-[1.25rem]"
      >
        {submitted ? (
          <p className="text-xs font-sans text-text-secondary">
            {/* TODO: Replace with real delivery estimate from API */}
            Delivery check for <strong className="text-text-primary">{pincode}</strong> will be available when the delivery API is connected.
          </p>
        ) : (
          <p className="text-xs font-sans text-text-secondary">
            Enter your pincode to check delivery availability.
          </p>
        )}
      </div>
    </div>
  )
}
