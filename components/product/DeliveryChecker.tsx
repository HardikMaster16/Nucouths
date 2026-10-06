'use client'

import React, { useState, useRef } from 'react'

interface DeliveryCheckerProps {
  onCheck?: (pincode: string) => void
}

function TruckSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
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
    onCheck?.(clean)
    setSubmitted(true)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-secondary"><TruckSmallIcon /></span>
        <span className="text-sm font-sans font-semibold text-text-primary">Delivery</span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Check delivery availability" noValidate>
        <label htmlFor="pincode-input" className="sr-only">Enter pincode</label>
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
          className="flex-1 h-10 px-3 border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-text-primary transition-colors duration-150"
        />
        <button
          type="submit"
          className="h-10 px-5 text-[11px] font-sans font-bold tracking-[0.12em] uppercase bg-text-primary text-white hover:bg-[#2a2a2a] transition-colors duration-200 focus-visible:outline-none shrink-0"
        >
          Check
        </button>
      </form>
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-2 min-h-[1rem]">
        {submitted && (
          <p className="text-[11px] font-sans text-text-secondary">
            Delivery for <strong className="text-text-primary">{pincode}</strong> will show once the delivery API is connected.
          </p>
        )}
      </div>
    </div>
  )
}
