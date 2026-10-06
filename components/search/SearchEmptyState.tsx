'use client'

// Search-specific "no results" state, passed into ProductsShell's
// `emptyState` prop — mirrors EmptyCart.tsx/EmptyOrders' structure exactly
// (icon, heading, copy, primary action) rather than inventing a new pattern.

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

function SearchOutlineIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

export function SearchEmptyState({ query }: { query: string }) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 px-6">
      <div className="text-border mb-6" aria-hidden="true">
        <SearchOutlineIcon />
      </div>
      <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-2">
        No results for &ldquo;{query}&rdquo;
      </h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-6">
        We couldn&apos;t find any products matching your search.
      </p>

      <div className="text-left mb-8">
        <p className="text-xs font-sans font-semibold tracking-wide uppercase text-text-secondary mb-2">
          Try:
        </p>
        <ul className="text-sm font-sans text-text-secondary list-disc list-inside space-y-1">
          <li>checking your spelling</li>
          <li>using fewer words</li>
          <li>searching for a category or product type</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full max-w-xs sm:w-auto">
          <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/products')}>
            Continue Shopping
          </Button>
        </div>
        <button
          type="button"
          onClick={() => router.push('/search')}
          className="text-xs font-sans font-medium tracking-wider uppercase text-text-secondary underline underline-offset-4 hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Clear Search
        </button>
      </div>
    </div>
  )
}
