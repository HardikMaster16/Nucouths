'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge, productBadgeToVariant } from '@/components/ui/Badge'
import { useWishlist } from '@/lib/wishlist-context'
import type { Product } from '@/lib/types'

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatPrice(price: number, currency: string): string {
  if (currency === 'INR') return `₹${price.toLocaleString('en-IN')}`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}

// ─── Icons ───────────────────────────────────────────────────────────────────

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

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product
  priority?: boolean
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { isWishlisted: checkWishlisted, toggleWishlist } = useWishlist()
  const isWishlisted = checkWishlisted(product.id)
  const [imgError, setImgError] = useState(false)
  const [hoverImgError, setHoverImgError] = useState(false)

  const badgeVariant = productBadgeToVariant(product.badge)
  const isSoldOut = !product.inStock || product.badge === 'SOLD OUT'
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null

  // Decide which image to show
  const primaryImage = product.images[0]
  const showHover = isHovered && !!product.hoverImage && !hoverImgError

  return (
    <article
      className="group flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Image wrapper ─────────────────────────────── */}
      <div className="relative overflow-hidden bg-surface aspect-[3/4] mb-3">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`View ${product.name}`}
          tabIndex={0}
          className="absolute inset-0 z-10"
        />

        {/* Primary image */}
        {!imgError ? (
          <Image
            src={primaryImage.src}
            alt={primaryImage.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={[
              'object-cover transition-all duration-500',
              isHovered && !showHover ? 'scale-[1.04]' : 'scale-100',
              showHover ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface text-text-secondary/30">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Hover image */}
        {product.hoverImage && (
          <Image
            src={product.hoverImage.src}
            alt={product.hoverImage.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={[
              'object-cover transition-all duration-500',
              showHover ? 'opacity-100 scale-[1.04]' : 'opacity-0 scale-100',
            ].join(' ')}
            onError={() => setHoverImgError(true)}
          />
        )}

        {/* Sold-out veil — visual overlay only; badge carries the text label */}
        {isSoldOut && (
          <div
            className="absolute inset-0 bg-white/35 z-[2] pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Badge */}
        {badgeVariant && (
          <div className="absolute top-2.5 left-2.5 z-[3]">
            <Badge variant={badgeVariant} />
          </div>
        )}

        {/* Wishlist button */}
        <button
          type="button"
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          onClick={(e) => { e.preventDefault(); toggleWishlist(product.id) }}
          className={[
            'absolute top-2.5 right-2.5 z-[3]',
            'w-7 h-7 flex items-center justify-center',
            'bg-white/90 backdrop-blur-sm shadow-card rounded-sm',
            'transition-all duration-250',
            isWishlisted ? 'text-text-primary opacity-100' : 'text-text-secondary hover:text-text-primary',
            isHovered || isWishlisted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:opacity-100',
          ].join(' ')}
        >
          <HeartIcon filled={isWishlisted} />
        </button>

        {/* Quick-add strip */}
        {!isSoldOut && (
          <button
            type="button"
            aria-label={`Quick add ${product.name} to cart`}
            onClick={(e) => e.preventDefault()}
            className={[
              'absolute bottom-0 left-0 right-0 z-[3]',
              'h-10 flex items-center justify-center gap-1.5',
              'bg-text-primary/95 text-white text-[10px] font-sans font-semibold tracking-[0.12em] uppercase',
              'transition-all duration-300 ease-in-out',
              'hover:bg-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset',
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
            ].join(' ')}
          >
            <PlusIcon />
            Quick Add
          </button>
        )}
      </div>

      {/* ── Product info ───────────────────────────────── */}
      <div className="flex flex-col gap-1 flex-1 px-0.5">
        {/* Colour swatches */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-0.5" role="list" aria-label="Available colours">
            {product.colors.slice(0, 5).map((color) => (
              <div
                key={color.name}
                role="listitem"
                title={color.name}
                aria-label={color.name}
                className="w-3 h-3 rounded-full border border-border/80 cursor-default hover:ring-1 hover:ring-text-secondary/50 hover:ring-offset-1 transition-all duration-150"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[10px] text-text-secondary font-sans leading-none">
                +{product.colors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Name */}
        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-sans font-medium text-text-primary leading-snug hover:underline underline-offset-2 decoration-text-secondary/50 transition-colors duration-150 line-clamp-2"
        >
          {product.name}
        </Link>

        {/* Price row */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={['text-sm font-sans font-medium', product.compareAtPrice ? 'text-sale' : 'text-text-primary'].join(' ')}>
            {formatPrice(product.price, product.currency)}
          </span>
          {product.compareAtPrice && (
            <>
              <span className="text-xs font-sans text-text-secondary line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
              <span className="text-[10px] font-sans font-bold text-sale bg-sale/10 px-1 py-0.5 rounded-sm">
                -{discount}%
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
