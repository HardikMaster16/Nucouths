'use client'

import React from 'react'

interface WishlistButtonProps {
  productName: string
  isWishlisted: boolean
  onToggle: () => void
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

export function WishlistButton({ productName, isWishlisted, onToggle }: WishlistButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isWishlisted}
      aria-label={
        isWishlisted
          ? `Remove ${productName} from wishlist`
          : `Add ${productName} to wishlist`
      }
      className={[
        'w-full h-12 flex items-center justify-center gap-2',
        'border border-border text-sm font-sans font-medium',
        'transition-all duration-200',
        'hover:border-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
        isWishlisted ? 'text-text-primary border-text-primary/30' : 'text-text-secondary hover:text-text-primary',
      ].join(' ')}
    >
      <HeartIcon filled={isWishlisted} />
      <span>{isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
    </button>
  )
}
