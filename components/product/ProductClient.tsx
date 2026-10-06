'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge, productBadgeToVariant } from '@/components/ui/Badge'
import { ProductGallery } from '@/components/product/ProductGallery'
import { SizeGuide } from '@/components/product/SizeGuide'
import { ProductAccordion } from '@/components/product/ProductAccordion'
import { DeliveryChecker } from '@/components/product/DeliveryChecker'
import type { AccordionItem } from '@/components/product/ProductAccordion'
import type { ProductDetail, StockState } from '@/lib/types'
import { getProductColors, getSizesForColor, findVariant, variantStockState } from '@/lib/product-detail-data'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(price: number, currency: string): string {
  if (currency === 'INR') return String.fromCharCode(8377) + price.toLocaleString('en-IN')
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function StarIcon({ filled, half }: { filled: boolean; half?: boolean }) {
  if (half) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="half-fill">
            <stop offset="50%" stopColor="#111111" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#half-fill)" stroke="#111111" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#111111' : 'none'} stroke="#111111" strokeWidth="1.5" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}
function ReturnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function BagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
function RulerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12h20M2 12l4-4M2 12l4 4M22 12l-4-4M22 12l-4 4" />
    </svg>
  )
}
function ChevronRightSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function DiamondIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 19 9 12 22 5 9 12 2" />
    </svg>
  )
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, reviewCount, size = 14 }: { rating: number; reviewCount: number; size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
        {[1,2,3,4,5].map((s) => <StarIcon key={s} filled={s <= Math.floor(rating)} half={s === Math.ceil(rating) && rating % 1 >= 0.5} />)}
      </div>
      <span className="text-sm font-sans text-text-secondary">{rating} ({reviewCount} reviews)</span>
    </div>
  )
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ category, subcategory, productName }: { category: string; subcategory?: string; productName: string }) {
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: category, href: `/collections/${category.toLowerCase()}` },
    ...(subcategory ? [{ label: subcategory, href: `/collections/${subcategory.toLowerCase()}` }] : []),
    { label: productName, href: null },
  ]
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center flex-wrap gap-1 text-[12px] font-sans text-text-secondary">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRightSmall />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-text-primary transition-colors duration-150">{crumb.label}</Link>
            ) : (
              <span className="text-text-primary font-medium">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ─── Color Selector ───────────────────────────────────────────────────────────

function ColorSelectorRef({ colors, selectedColor, onSelect }: { colors: Array<{ name: string; hex: string }>; selectedColor: string | null; onSelect: (n: string) => void }) {
  return (
    <div>
      <p className="text-sm font-sans font-medium text-text-primary mb-3">
        Color: <span className="font-normal text-text-secondary">{selectedColor}</span>
      </p>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Select colour">
        {colors.map((color) => {
          const isSel = selectedColor === color.name
          return (
            <button key={color.name} type="button" role="radio" aria-checked={isSel} aria-label={color.name} title={color.name} onClick={() => onSelect(color.name)}
              className={['w-8 h-8 rounded-full transition-all duration-200 focus-visible:outline-none', isSel ? 'ring-2 ring-text-primary ring-offset-2' : 'ring-1 ring-border hover:ring-text-primary/40'].join(' ')}
              style={{ backgroundColor: color.hex }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Size Selector ────────────────────────────────────────────────────────────

const CLOTHING_ORDER = ['XS','S','M','L','XL','XXL','XXXL']
const isClothingSize = (s: string) => CLOTHING_ORDER.includes(s)
const isOneSize = (s: string) => s === 'ONE SIZE' || s === 'ONE_SIZE'

function SizeSelectorRef({ sizes, availableSizes, selectedSize, onSelect, onSizeGuide }: { sizes: string[]; availableSizes: Set<string>; selectedSize: string | null; onSelect: (s: string) => void; onSizeGuide: () => void }) {
  if (sizes.length === 0) return null
  const allSizes = [...sizes.filter(isClothingSize), ...sizes.filter(s => !isClothingSize(s) && !isOneSize(s)), ...(sizes.some(isOneSize) ? ['ONE SIZE'] : [])]
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-sans font-medium text-text-primary">
          Size: {selectedSize && !isOneSize(selectedSize)
            ? <span className="font-normal text-text-secondary">{selectedSize}</span>
            : <span className="font-normal text-text-secondary">Select a size</span>
          }
        </p>
        <button type="button" onClick={onSizeGuide} className="flex items-center gap-1 text-[12px] font-sans text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none">
          <RulerIcon /> Size Guide
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Select size">
        {allSizes.map((size) => {
          const isAvail = availableSizes.has(size)
          const isSel = selectedSize === size
          return (
            <button key={size} type="button" aria-pressed={isSel} disabled={!isAvail} onClick={() => onSelect(size)}
              className={['h-10 min-w-[44px] px-3 flex items-center justify-center text-[13px] font-sans font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                isSel && isAvail ? 'bg-text-primary border-text-primary text-white' : isAvail ? 'bg-white border-border text-text-primary hover:border-text-primary' : 'bg-white border-border text-text-secondary/40 cursor-not-allowed line-through'].join(' ')}
            >{size}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stock Indicator ──────────────────────────────────────────────────────────

function StockIndicator({ state, stock }: { state: StockState; stock: number }) {
  if (state === 'in-stock') return null
  if (state === 'sold-out' || state === 'out-of-stock') return <p className="text-xs font-sans font-semibold text-sale" role="status" aria-live="polite">Sold out</p>
  if (state === 'low-stock') return <p className="text-xs font-sans font-semibold text-[#B45309]" role="status" aria-live="polite">Only {stock} left</p>
  return null
}

// ─── Customer Reviews Section ─────────────────────────────────────────────────

function ReviewsSection({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const bars = [
    { stars: 5, count: Math.round(reviewCount * 0.83), pct: 83 },
    { stars: 4, count: Math.round(reviewCount * 0.13), pct: 13 },
    { stars: 3, count: Math.round(reviewCount * 0.03), pct: 3 },
    { stars: 2, count: Math.round(reviewCount * 0.008), pct: 1 },
    { stars: 1, count: 0, pct: 0 },
  ]
  return (
    <section aria-label="Customer Reviews">
      <h2 className="text-lg font-sans font-semibold text-text-primary mb-5">Customer Reviews</h2>

      {/* Summary row */}
      <div className="flex items-start gap-6 mb-6">
        <div className="text-center shrink-0">
          <p className="text-5xl font-sans font-bold text-text-primary leading-none">{rating}</p>
          <div className="flex items-center gap-0.5 mt-2 justify-center">
            {[1,2,3,4,5].map(s => <StarIcon key={s} filled={s <= Math.round(rating)} />)}
          </div>
          <p className="text-[11px] font-sans text-text-secondary mt-1">{reviewCount} reviews</p>
        </div>

        {/* Rating bars */}
        <div className="flex-1 space-y-1.5">
          {bars.map(({ stars, count, pct }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-[12px] font-sans text-text-secondary w-3 shrink-0">{stars}</span>
              <StarIcon filled />
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-text-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[12px] font-sans text-text-secondary w-6 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fit badge */}
      <div className="flex items-center gap-2 p-3 border border-border rounded-sm mb-5">
        <DiamondIcon />
        <span className="text-[12px] font-sans text-text-secondary">87% say it fits true to size</span>
      </div>

      <button type="button" className="w-full h-10 border border-border text-[12px] font-sans font-medium text-text-secondary hover:border-text-primary hover:text-text-primary transition-colors duration-150 focus-visible:outline-none">
        View All Reviews
      </button>
    </section>
  )
}

// ─── Complete the Look ────────────────────────────────────────────────────────

function CompleteTheLook({ products }: { products: ProductDetail[] }) {
  const [startIndex, setStartIndex] = useState(0)
  const visible = products.slice(startIndex, startIndex + 3)
  const canPrev = startIndex > 0
  const canNext = startIndex + 3 < products.length

  if (products.length === 0) return null
  return (
    <section aria-label="Complete the Look">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-sans font-semibold text-text-primary">Complete the Look</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setStartIndex(i => Math.max(0, i - 1))} disabled={!canPrev} aria-label="Previous"
            className="w-7 h-7 flex items-center justify-center border border-border text-text-secondary disabled:opacity-30 hover:border-text-primary hover:text-text-primary transition-colors duration-150 focus-visible:outline-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" onClick={() => setStartIndex(i => Math.min(products.length - 3, i + 1))} disabled={!canNext} aria-label="Next"
            className="w-7 h-7 flex items-center justify-center border border-border text-text-secondary disabled:opacity-30 hover:border-text-primary hover:text-text-primary transition-colors duration-150 focus-visible:outline-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {visible.map((p) => (
          <div key={p.id} className="group">
            <Link href={`/products/${p.slug}`}>
              <div className="relative aspect-square overflow-hidden bg-surface mb-2">
                {p.images[0] && (
                  <Image src={p.images[0].src} alt={p.images[0].alt} fill sizes="150px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
              </div>
              <p className="text-[12px] font-sans text-text-primary leading-tight mb-1 line-clamp-1">{p.name}</p>
            </Link>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-sans font-semibold text-text-primary">{fmtPrice(p.price, p.currency)}</span>
              <button type="button" aria-label={`Add ${p.name} to bag`}
                className="w-6 h-6 flex items-center justify-center border border-border text-text-secondary hover:bg-text-primary hover:border-text-primary hover:text-white transition-all duration-150 focus-visible:outline-none">
                <PlusIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── ProductClient ────────────────────────────────────────────────────────────

interface ProductClientProps { product: ProductDetail; relatedProducts: ProductDetail[] }

export function ProductClient({ product, relatedProducts }: ProductClientProps) {
  const { addItem } = useCart()
  const { isWishlisted: checkWishlisted, toggleWishlist } = useWishlist()
  const isWishlisted = checkWishlisted(product.id)
  const [selectedColor, setSelectedColor] = useState<string | null>(() => getProductColors(product.variants)[0]?.name ?? null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [bagAdded, setBagAdded] = useState(false)

  useEffect(() => {
    setSelectedColor(getProductColors(product.variants)[0]?.name ?? null)
    setSelectedSize(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const availableColors = useMemo(() => getProductColors(product.variants), [product.variants])
  const sizesForColor = useMemo(() => selectedColor ? getSizesForColor(product.variants, selectedColor) : product.sizes ?? [], [selectedColor, product.variants, product.sizes])
  const availableSizeSet = useMemo<Set<string>>(() => {
    if (!selectedColor) return new Set()
    return new Set(product.variants.filter(v => v.color === selectedColor && v.stock > 0).map(v => v.size))
  }, [selectedColor, product.variants])

  const hasSizes = product.variants.some(v => v.size !== 'ONE SIZE' && v.size !== 'ONE_SIZE')
  const effectiveSize = hasSizes ? selectedSize : sizesForColor[0] ?? null
  const activeVariant = useMemo(() => selectedColor && effectiveSize ? findVariant(product.variants, selectedColor, effectiveSize) : null, [selectedColor, effectiveSize, product.variants])
  const stockState: StockState | null = useMemo(() => { if (!product.inStock) return 'sold-out'; if (!activeVariant) return null; return variantStockState(activeVariant.stock) }, [activeVariant, product.inStock])
  const effectivePrice = activeVariant?.priceOverride ?? product.price
  const discount = product.compareAtPrice ? Math.round(((product.compareAtPrice - effectivePrice) / product.compareAtPrice) * 100) : null
  const rating = (product as ProductDetail & { rating?: number }).rating ?? 4.8
  const reviewCount = (product as ProductDetail & { reviewCount?: number }).reviewCount ?? 128

  const handleColorSelect = useCallback((color: string) => { setSelectedColor(color); setSelectedSize(null) }, [])
  const handleSizeSelect = useCallback((size: string) => setSelectedSize(size), [])

  const handleAddToBag = useCallback(() => {
    if (!selectedColor || !activeVariant) return
    addItem({ productId: product.id, variantId: activeVariant.id, slug: product.slug, name: product.name, category: product.category, color: selectedColor, size: effectiveSize ?? activeVariant.size, quantity: 1, price: effectivePrice, compareAtPrice: product.compareAtPrice, currency: product.currency, image: product.images[0], stock: activeVariant.stock })
    setBagAdded(true)
    setTimeout(() => setBagAdded(false), 2000)
  }, [selectedColor, activeVariant, effectiveSize, effectivePrice, product, addItem])

  const isCTADisabled = !selectedColor || (hasSizes && !selectedSize) || stockState === 'sold-out' || stockState === 'out-of-stock'
  const ctaLabel = stockState === 'sold-out' || stockState === 'out-of-stock' ? 'SOLD OUT' : !selectedColor ? 'SELECT A COLOUR' : hasSizes && !selectedSize ? 'SELECT A SIZE' : 'ADD TO BAG'

  // Accordions
  const accordionItems: AccordionItem[] = []
  if (product.description || product.details.length > 0) {
    accordionItems.push({ id: 'details', title: 'Product Details', content: (
      <div className="space-y-3">
        {product.description && <p className="leading-relaxed">{product.description}</p>}
        {product.details.length > 0 && <ul className="space-y-1">{product.details.map((d,i) => <li key={i} className="flex items-start gap-2"><span className="mt-2 w-1 h-1 rounded-full bg-text-secondary/40 shrink-0" />{d}</li>)}</ul>}
      </div>
    )})
  }
  if ((product.sizes?.length ?? 0) > 0 || product.materials.length > 0) {
    accordionItems.push({ id: 'size-fit', title: 'Size & Fit', content: (
      <div className="space-y-2">
        {(product.sizes?.length ?? 0) > 0 && <p className="text-sm">Available sizes: {product.sizes!.join(', ')}</p>}
        {product.materials.map((m,i) => <p key={i} className="text-sm">{m}</p>)}
      </div>
    )})
  }
  if (product.care.length > 0) {
    accordionItems.push({ id: 'care', title: 'Fabric & Care', content: <ul className="space-y-1">{product.care.map((c,i) => <li key={i} className="flex items-start gap-2"><span className="mt-2 w-1 h-1 rounded-full bg-text-secondary/40 shrink-0" />{c}</li>)}</ul> })
  }
  accordionItems.push({ id: 'shipping', title: 'Shipping & Returns', content: (
    <div className="space-y-3">
      {product.shipping && <div><p className="font-medium text-xs tracking-wide uppercase mb-1">Shipping</p><p>{product.shipping}</p></div>}
      {product.returns && <div><p className="font-medium text-xs tracking-wide uppercase mb-1">Returns</p><p>{product.returns}</p></div>}
      {!product.shipping && !product.returns && <p className="text-sm">Free shipping on orders above {String.fromCharCode(8377)}999. Easy 30-day returns.</p>}
    </div>
  )})

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb category={product.category} subcategory={product.subcategory} productName={product.name} />

      {/* ── Two-column: gallery | info ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">

        {/* Gallery column */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* Info column */}
        <div className="lg:sticky lg:top-[72px] lg:self-start flex flex-col gap-4">

          {/* Badge */}
          {product.badge && productBadgeToVariant(product.badge) && (
            <div><Badge variant={productBadgeToVariant(product.badge)!} /></div>
          )}

          {/* Name */}
          <h1 className="font-display text-[1.85rem] sm:text-[2.1rem] text-text-primary leading-[1.1] font-normal">
            {product.name}
          </h1>

          {/* Stars */}
          <StarRating rating={rating} reviewCount={reviewCount} />

          {/* Price */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[1.7rem] font-sans font-bold text-text-primary tracking-tight">
              {fmtPrice(effectivePrice, product.currency)}
            </span>
            {product.compareAtPrice && (<>
              <span className="text-base font-sans text-text-secondary line-through">{fmtPrice(product.compareAtPrice, product.currency)}</span>
              {discount !== null && <span className="text-[11px] font-sans font-bold text-white bg-sale px-2 py-0.5 rounded-sm">{discount}% OFF</span>}
            </>)}
          </div>

          {/* Description */}
          <p className="text-sm font-sans text-text-secondary leading-relaxed">{product.shortDescription}</p>

          {/* Divider */}
          <div className="border-t border-border" aria-hidden="true" />

          {/* Colour */}
          {availableColors.length > 0 && (
            <ColorSelectorRef colors={availableColors} selectedColor={selectedColor} onSelect={handleColorSelect} />
          )}

          {/* Size */}
          {hasSizes && (
            <SizeSelectorRef sizes={sizesForColor} availableSizes={availableSizeSet} selectedSize={selectedSize} onSelect={handleSizeSelect} onSizeGuide={() => setSizeGuideOpen(true)} />
          )}

          {/* Stock */}
          {activeVariant && stockState && <StockIndicator state={stockState} stock={activeVariant.stock} />}

          {/* Add to Bag + Wishlist */}
          <div className="flex gap-2 mt-1">
            {bagAdded ? (
              <div className="flex-1 flex items-center justify-center bg-[#2a2a2a] text-white text-[12px] font-sans font-semibold tracking-[0.1em]" style={{ height: '52px' }} role="status" aria-live="polite">
                ✓ ADDED TO BAG
              </div>
            ) : (
              <button type="button" onClick={handleAddToBag} disabled={isCTADisabled} aria-label={ctaLabel}
                className={['flex-1 flex items-center justify-center gap-2.5 text-[13px] font-sans font-semibold tracking-[0.08em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2',
                  isCTADisabled ? 'bg-border text-text-secondary cursor-not-allowed' : 'bg-text-primary text-white hover:bg-[#2a2a2a]'].join(' ')}
                style={{ height: '52px' }}
              >
                <BagIcon />{ctaLabel}
              </button>
            )}
            <button type="button" aria-pressed={isWishlisted} aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => toggleWishlist(product.id)}
              className={['shrink-0 flex items-center justify-center border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
                isWishlisted ? 'border-sale text-sale' : 'border-border text-text-secondary hover:border-text-primary hover:text-text-primary'].join(' ')}
              style={{ width: '52px', height: '52px' }}
            >
              <HeartIcon filled={isWishlisted} />
            </button>
          </div>

          {/* Delivery Checker */}
          <div className="border border-border p-4">
            <DeliveryChecker />
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-1 border-t border-border pt-4">
            {[
              { icon: <TruckIcon />, title: 'Free Shipping', sub: `On orders above ${String.fromCharCode(8377)}999` },
              { icon: <ReturnIcon />, title: 'Easy Returns', sub: '30-day return policy' },
              { icon: <LockIcon />, title: 'Secure Payment', sub: '100% secure checkout' },
            ].map(({ icon, title, sub }) => (
              <div key={title} className="flex flex-col items-center text-center gap-1.5 py-2 px-1">
                <span className="text-text-secondary">{icon}</span>
                <span className="text-[10px] font-sans font-semibold text-text-primary leading-tight">{title}</span>
                <span className="text-[10px] font-sans text-text-secondary leading-tight">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom 3-column section ────────────────────────────────────────── */}
      <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-8 xl:gap-12 border-t border-border pt-10">

        {/* Accordion: product info */}
        <div>
          <ProductAccordion items={accordionItems} defaultOpen="details" />
        </div>

        {/* Customer reviews */}
        <ReviewsSection rating={rating} reviewCount={reviewCount} />

        {/* Complete the look */}
        <CompleteTheLook products={relatedProducts} />
      </div>

      {/* Size guide */}
      <SizeGuide isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} category={product.category} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-sm border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" aria-label="Mobile purchase actions">
        <div className="flex gap-2 max-w-lg mx-auto">
          <button type="button" onClick={handleAddToBag} disabled={isCTADisabled}
            className={['flex-1 h-12 flex items-center justify-center gap-2 text-[12px] font-sans font-semibold tracking-[0.08em] transition-all duration-200',
              isCTADisabled ? 'bg-border text-text-secondary cursor-not-allowed' : 'bg-text-primary text-white hover:bg-[#2a2a2a]'].join(' ')}
          ><BagIcon />{stockState === 'sold-out' ? 'SOLD OUT' : 'ADD TO BAG'}</button>
          <button type="button" aria-pressed={isWishlisted} aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => toggleWishlist(product.id)}
            className={['w-12 h-12 shrink-0 flex items-center justify-center border transition-all duration-200', isWishlisted ? 'border-sale text-sale' : 'border-border text-text-secondary hover:border-text-primary'].join(' ')}
          ><HeartIcon filled={isWishlisted} /></button>
        </div>
      </div>
    </>
  )
}
