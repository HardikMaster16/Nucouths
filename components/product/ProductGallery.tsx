'use client'

import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { ProductImage } from '@/lib/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  const clamp = (i: number) => Math.max(0, Math.min(i, images.length - 1))

  const go = useCallback(
    (index: number) => {
      const next = clamp(index)
      setActive(next)
      // Keep mobile scroll in sync
      if (mobileScrollRef.current) {
        const child = mobileScrollRef.current.children[next] as HTMLElement
        if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
      }
    },
    [images.length] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleError = (i: number) => setImgErrors((prev) => new Set(prev).add(i))

  return (
    <div className="flex flex-col gap-3">
      {/* ── Desktop layout: large image + vertical thumbnail strip ── */}
      <div className="hidden md:flex gap-3 items-start">
        {/* Thumbnails — left side */}
        {images.length > 1 && (
          <div
            className="flex flex-col gap-2 shrink-0"
            role="list"
            aria-label="Product image thumbnails"
          >
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                role="listitem"
                aria-label={`View image ${i + 1}: ${img.alt}`}
                aria-pressed={active === i}
                onClick={() => go(i)}
                className={[
                  'relative w-[72px] xl:w-20 aspect-[3/4] overflow-hidden bg-surface',
                  'border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                  active === i ? 'border-text-primary' : 'border-transparent hover:border-border',
                ].join(' ')}
              >
                {!imgErrors.has(i) ? (
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="80px"
                    className="object-cover"
                    onError={() => handleError(i)}
                  />
                ) : (
                  <div className="absolute inset-0 bg-surface flex items-center justify-center text-border">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main large image */}
        <div className="relative flex-1 aspect-[3/4] overflow-hidden bg-surface">
          {!imgErrors.has(active) ? (
            <Image
              src={images[active].src}
              alt={images[active].alt}
              fill
              sizes="(max-width: 1024px) 60vw, 45vw"
              priority={active === 0}
              className="object-cover transition-opacity duration-300"
            />
          ) : (
            <div className="absolute inset-0 bg-surface flex items-center justify-center text-text-secondary/30">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}

          {/* Prev / Next arrows — show on hover */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(active - 1)}
                disabled={active === 0}
                aria-label="Previous image"
                className={[
                  'absolute left-3 top-1/2 -translate-y-1/2 z-10',
                  'w-9 h-9 flex items-center justify-center',
                  'bg-white/90 backdrop-blur-sm text-text-primary shadow-sm',
                  'transition-all duration-200 hover:bg-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                  'disabled:opacity-0 disabled:pointer-events-none',
                  'opacity-0 group-hover:opacity-100',
                ].join(' ')}
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                disabled={active === images.length - 1}
                aria-label="Next image"
                className={[
                  'absolute right-3 top-1/2 -translate-y-1/2 z-10',
                  'w-9 h-9 flex items-center justify-center',
                  'bg-white/90 backdrop-blur-sm text-text-primary shadow-sm',
                  'transition-all duration-200 hover:bg-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                  'disabled:opacity-0 disabled:pointer-events-none',
                  'opacity-0 group-hover:opacity-100',
                ].join(' ')}
              >
                <ChevronRightIcon />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile layout: horizontal scroll carousel ── */}
      <div className="md:hidden relative">
        <div
          ref={mobileScrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-2 no-scrollbar"
          onScroll={(e) => {
            const el = e.currentTarget
            const idx = Math.round(el.scrollLeft / el.offsetWidth)
            setActive(idx)
          }}
          aria-label={`${productName} image gallery`}
          role="region"
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="relative shrink-0 w-full aspect-[3/4] snap-start overflow-hidden bg-surface"
            >
              {!imgErrors.has(i) ? (
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  className="object-cover"
                  onError={() => handleError(i)}
                />
              ) : (
                <div className="absolute inset-0 bg-surface flex items-center justify-center text-text-secondary/30">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Image counter pill */}
        {images.length > 1 && (
          <div
            className="absolute bottom-3 right-3 bg-black/50 text-white text-[11px] font-sans px-2.5 py-1 rounded-full pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
          >
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* ── Mobile dot indicators ── */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 md:hidden" aria-hidden="true">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to image ${i + 1}`}
              className={[
                'rounded-full transition-all duration-200',
                active === i ? 'w-4 h-1.5 bg-text-primary' : 'w-1.5 h-1.5 bg-border',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
