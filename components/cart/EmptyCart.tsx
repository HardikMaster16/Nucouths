'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

function BagOutlineIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

/** Shared empty-cart state, used by both /cart and /checkout. */
export function EmptyCart() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 sm:py-28">
      <div className="text-text-secondary/30 mb-6" aria-hidden="true">
        <BagOutlineIcon />
      </div>
      <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight mb-3">
        Your bag is empty
      </h1>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        Looks like you haven&apos;t added anything yet. Explore the collection and find something you&apos;ll love.
      </p>
      <div className="w-full max-w-xs">
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/products')}>
          Shop Now
        </Button>
      </div>
    </div>
  )
}
