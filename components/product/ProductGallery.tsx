'use client'

import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { ProductImage } from '@/lib/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
  showPrimaryBadge?: boolean
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function ZoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}
function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 bg-surface flex items-center justify-center text-border">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  )
}

const THUMBS_VISIBLE = 6

export function ProductGallery({ images, productName, showPrimaryBadge }: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const [thumbOffset, setThumbOffset] = useState(0)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  const clamp = (i: number) => Math.max(0, Math.min(i, images.length - 1))
  const handleError = (i: number) => setImgErrors((prev) => new Set(prev).add(i))

  const go = useCallback((index: number) => {
    const next = clamp(index)
    setActive(next)
    if (mobileScrollRef.current) {
      const child = mobileScrollRef.current.children[next] as HTMLElement
      child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }, [images.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const canScrollDown = thumbOffset + THUMBS_VISIBLE < images.length
  const canScrollUp = thumbOffset > 0

  // Grid images: images after index 0, up to 4 shown in the right grid
  const gridImages = images.slice(1, 5)

  return (
    <>
      {/* ── Desktop: thumbnails | main | grid ─────────────────── */}
      <div className="hidden md:flex gap-2 items-start">

        {/* Thumbnail strip — left */}
        <div className="flex flex-col gap-1.5 shrink-0 w-[76px]" role="list" aria-label="Product image thumbnails">
          {images.slice(thumbOffset, thumbOffset + THUMBS_VISIBLE).map((img, i) => {
            const realIndex = thumbOffset + i
            const isSel = active === realIndex
            return (
              <button
                key={realIndex}
                type="button"
                role="listitem"
                aria-label={`View image ${realIndex + 1}: ${img.alt}`}
                aria-pressed={isSel}
                onClick={() => go(realIndex)}
                className={[
                  'relative w-full aspect-square overflow-hidden bg-surface border transition-all duration-200 focus-visible:outline-none',
                  isSel ? 'border-text-primary' : 'border-transparent hover:border-border',
                ].join(' ')}
              >
                {!imgErrors.has(realIndex) ? (
                  <Image src={img.src} alt={img.alt} fill sizes="76px" className="object-cover" onError={() => handleError(realIndex)} />
                ) : <ImagePlaceholder />}
              </button>
            )
          })}

          {/* Scroll down arrow */}
          {images.length > THUMBS_VISIBLE && (
            <button
              type="button"
              onClick={() => {
                if (canScrollDown) setThumbOffset(o => o + 1)
                else setThumbOffset(0)
              }}
              aria-label="Show more thumbnails"
              className="w-full flex items-center justify-center py-1.5 text-text-secondary hover:text-text-primary transition-colors duration-150 focus-visible:outline-none"
            >
              <ChevronDownIcon />
            </button>
          )}
        </div>

        {/* Main image — center */}
        <div className="relative flex-[0_0_auto] w-[calc(50%-44px)] aspect-[3/4] overflow-hidden bg-surface group">
          {showPrimaryBadge && active === 0 && (
            <span className="absolute top-2 left-2 z-10 text-[10px] font-sans font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-text-primary text-white">Primary</span>
          )}
          {!imgErrors.has(active) ? (
            <Image
              src={images[active].src}
              alt={images[active].alt}
              fill
              sizes="(max-width: 1280px) 38vw, 480px"
              priority={active === 0}
              className="object-cover transition-opacity duration-300"
              onError={() => handleError(active)}
            />
          ) : <ImagePlaceholder />}

          {/* Zoom icon */}
          <button
            type="button"
            aria-label="Zoom image"
            className="absolute bottom-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 text-text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus-visible:outline-none"
          >
            <ZoomIcon />
          </button>

          {/* Prev/next arrows */}
          {images.length > 1 && (<>
            <button
              type="button"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 text-text-primary shadow-sm opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity duration-200 focus-visible:outline-none"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              disabled={active === images.length - 1}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 text-text-primary shadow-sm opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity duration-200 focus-visible:outline-none"
            >
              <ChevronRightIcon />
            </button>
          </>)}
        </div>

        {/* Grid of images — right, 2x2 */}
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((slot) => {
            const img = gridImages[slot]
            const realIndex = slot + 1
            if (!img) {
              return <div key={slot} className="aspect-square bg-surface/40" />
            }
            return (
              <button
                key={slot}
                type="button"
                onClick={() => go(realIndex)}
                aria-label={`View image ${realIndex + 1}`}
                className={['relative aspect-square overflow-hidden bg-surface border-2 transition-all duration-200 focus-visible:outline-none', active === realIndex ? 'border-text-primary' : 'border-transparent hover:border-border'].join(' ')}
              >
                {!imgErrors.has(realIndex) ? (
                  <Image src={img.src} alt={img.alt} fill sizes="20vw" className="object-cover" onError={() => handleError(realIndex)} />
                ) : <ImagePlaceholder />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Mobile: horizontal scroll carousel ─────────────────── */}
      <div className="md:hidden relative">
        <div
          ref={mobileScrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-2 no-scrollbar"
          onScroll={(e) => {
            const el = e.currentTarget
            setActive(Math.round(el.scrollLeft / el.offsetWidth))
          }}
          aria-label={`${productName} image gallery`}
          role="region"
        >
          {images.map((img, i) => (
            <div key={i} className="relative shrink-0 w-full aspect-[3/4] snap-start overflow-hidden bg-surface">
              {!imgErrors.has(i) ? (
                <Image src={img.src} alt={img.alt} fill sizes="100vw" priority={i === 0} className="object-cover" onError={() => handleError(i)} />
              ) : <ImagePlaceholder />}
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-[11px] font-sans px-2.5 py-1 rounded-full pointer-events-none" aria-live="polite">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Mobile dots */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 md:hidden mt-2" aria-hidden="true">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={`Go to image ${i + 1}`}
              className={['rounded-full transition-all duration-200', active === i ? 'w-4 h-1.5 bg-text-primary' : 'w-1.5 h-1.5 bg-border'].join(' ')}
            />
          ))}
        </div>
      )}
    </>
  )
}
