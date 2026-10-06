'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Search Input
//
// The one prominent, editable search field on /search itself (the Header's
// search icon is just an entry point into this page — see Header.tsx). The
// URL is the source of truth: this component only ever reads its initial
// value from the current ?q= (passed in as `defaultValue` from the server
// page) and pushes a new URL on submit; it doesn't hold the "current search"
// as component state.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeSearchQuery } from '@/lib/product-filters'

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

interface SearchFormProps {
  defaultValue: string
}

export function SearchForm({ defaultValue }: SearchFormProps) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = normalizeSearchQuery(value)
    // An empty (or whitespace-only) submission goes to the bare /search
    // landing page rather than /search?q= — never a query string with
    // nothing but encoded spaces.
    router.push(normalized ? `/search?q=${encodeURIComponent(normalized)}` : '/search')
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex items-stretch gap-0 max-w-xl">
      <label htmlFor="search-input" className="sr-only">
        Search products
      </label>
      <div className="relative flex-1">
        <span className="absolute inset-y-0 left-3.5 flex items-center text-text-secondary pointer-events-none">
          <SearchIcon />
        </span>
        <input
          id="search-input"
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search products…"
          autoComplete="off"
          className="w-full h-12 pl-11 pr-3.5 border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-text-primary focus:border-text-primary transition-colors duration-150"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 h-12 px-6 bg-text-primary text-white text-xs font-sans font-semibold tracking-[0.12em] uppercase hover:bg-[#2a2a2a] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2"
      >
        Search
      </button>
    </form>
  )
}
