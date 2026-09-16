'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Badge, productBadgeToVariant } from '@/components/ui/Badge'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ColorSelector } from '@/components/product/ColorSelector'
import { SizeSelector } from '@/components/product/SizeSelector'
import { SizeGuide } from '@/components/product/SizeGuide'
import { QuantitySelector } from '@/components/product/QuantitySelector'
import { AddToBagButton } from '@/components/product/AddToBagButton'
import { WishlistButton } from '@/components/product/WishlistButton'
import { DeliveryChecker } from '@/components/product/DeliveryChecker'
import { ProductAccordion } from '@/components/product/ProductAccordion'
import type { ProductDetail, StockState } from '@/lib/types'
import {
  getProductColors,
  getSizesForColor,
  findVariant,
  variantStockState,
  getRelatedProducts,
} from '@/lib/product-detail-data'
import { RelatedProducts } from '@/components/product/RelatedProducts'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(price: number, currency: string): string {
  if (currency === 'INR') return `₹${price.toLocaleString('en-IN')}`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}

function StockIndicator({ state, stock }: { state: StockState; stock: number }) {
  if (state === 'in-stock') return null
  if (state === 'sold-out' || state === 'out-of-stock') {
    return (
      <p className="text-xs font-sans font-semibold text-sale" role="status" aria-live="polite">
        Sold out
      </p>
    )
  }
  if (state === 'low-stock') {
    return (
      <p className="text-xs font-sans font-semibold text-[#B45309]" role="status" aria-live="polite">
        Only {stock} left
      </p>
    )
  }
  return null
}

// ─── ProductClient ────────────────────────────────────────────────────────────

interface ProductClientProps {
  product: ProductDetail
}

export function ProductClient({ product }: ProductClientProps) {
  const { addItem } = useCart()
  const { isWishlisted: checkWishlisted, toggleWishlist } = useWishlist()
  const isWishlisted = checkWishlisted(product.id)
  const [selectedColor, setSelectedColor] = useState<string | null>(
    () => getProductColors(product.variants)[0]?.name ?? null
  )
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [bagAdded, setBagAdded] = useState(false)

  // ── Derived data ──────────────────────────────────────────────────────────

  const availableColors = useMemo(
    () => getProductColors(product.variants),
    [product.variants]
  )

  // Re-sync selection when navigating client-side between products (this
  // component instance can persist across a slug change, e.g. via a
  // related-product link), so a previous product's colour/size never lingers.
  useEffect(() => {
    setSelectedColor(getProductColors(product.variants)[0]?.name ?? null)
    setSelectedSize(null)
    setQuantity(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const sizesForColor = useMemo(
    () =>
      selectedColor
        ? getSizesForColor(product.variants, selectedColor)
        : product.sizes ?? [],
    [selectedColor, product.variants, product.sizes]
  )

  const availableSizeSet = useMemo<Set<string>>(() => {
    if (!selectedColor) return new Set()
    return new Set(
      product.variants
        .filter((v) => v.color === selectedColor && v.stock > 0)
        .map((v) => v.size)
    )
  }, [selectedColor, product.variants])

  // Does this product use sized variants?
  const hasSizes = product.variants.some(
    (v) => v.size !== 'ONE SIZE' && v.size !== 'ONE_SIZE'
  )

  // For one-size products there's no size selector, so `selectedSize` is
  // never set by the user — fall back to the (single) size listed for the
  // selected colour so the variant can still resolve.
  const effectiveSize = hasSizes ? selectedSize : sizesForColor[0] ?? null

  const activeVariant = useMemo(
    () =>
      selectedColor && effectiveSize
        ? findVariant(product.variants, selectedColor, effectiveSize)
        : null,
    [selectedColor, effectiveSize, product.variants]
  )

  const stockState: StockState | null = useMemo(() => {
    if (!product.inStock) return 'sold-out'
    if (!activeVariant) return null
    return variantStockState(activeVariant.stock)
  }, [activeVariant, product.inStock])

  const effectivePrice = activeVariant?.priceOverride ?? product.price
  const discount =
    product.compareAtPrice
      ? Math.round(((product.compareAtPrice - effectivePrice) / product.compareAtPrice) * 100)
      : null

  const maxQty = activeVariant?.stock ?? 1
  const related = useMemo(() => getRelatedProducts(product, 4), [product])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color)
    setSelectedSize(null)
    setQuantity(1)
  }, [])

  const handleSizeSelect = useCallback((size: string) => {
    setSelectedSize(size)
    setQuantity(1)
  }, [])

  const handleAddToBag = useCallback(() => {
    if (!selectedColor || !activeVariant) return
    addItem({
      productId: product.id,
      variantId: activeVariant.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      color: selectedColor,
      size: effectiveSize ?? activeVariant.size,
      quantity,
      price: effectivePrice,
      compareAtPrice: product.compareAtPrice,
      currency: product.currency,
      image: product.images[0],
    })
    setBagAdded(true)
    setTimeout(() => setBagAdded(false), 2000)
  }, [selectedColor, activeVariant, effectiveSize, quantity, effectivePrice, product, addItem])

  // ── Accordion content ─────────────────────────────────────────────────────

  const accordionItems = [
    {
      id: 'description',
      title: 'Description',
      content: <p className="leading-relaxed">{product.description}</p>,
    },
    {
      id: 'details',
      title: 'Details & Materials',
      content: (
        <div className="space-y-4">
          {product.materials.length > 0 && (
            <div>
              <p className="font-medium text-text-primary text-xs tracking-wide uppercase mb-2">
                Materials
              </p>
              <ul className="space-y-1">
                {product.materials.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 w-1 h-1 rounded-full bg-text-secondary/40 shrink-0" aria-hidden="true" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {product.details.length > 0 && (
            <div>
              <p className="font-medium text-text-primary text-xs tracking-wide uppercase mb-2">
                Details
              </p>
              <ul className="space-y-1">
                {product.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 w-1 h-1 rounded-full bg-text-secondary/40 shrink-0" aria-hidden="true" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'care',
      title: 'Care Instructions',
      content: (
        <ul className="space-y-1">
          {product.care.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-2 w-1 h-1 rounded-full bg-text-secondary/40 shrink-0" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'shipping',
      title: 'Shipping & Returns',
      content: (
        <div className="space-y-3">
          <div>
            <p className="font-medium text-text-primary text-xs tracking-wide uppercase mb-1.5">Shipping</p>
            <p>{product.shipping}</p>
          </div>
          <div>
            <p className="font-medium text-text-primary text-xs tracking-wide uppercase mb-1.5">Returns</p>
            <p>{product.returns}</p>
          </div>
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Two-column product layout                                       */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_440px] gap-8 lg:gap-12 xl:gap-16 items-start">

        {/* ── Gallery column ──────────────────────────────────────────── */}
        <div className="group">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* ── Info / purchase column ───────────────────────────────────── */}
        <div className="lg:sticky lg:top-[72px] lg:self-start flex flex-col gap-5">

          {/* Badge */}
          {product.badge && productBadgeToVariant(product.badge) && (
            <div>
              <Badge variant={productBadgeToVariant(product.badge)!} />
            </div>
          )}

          {/* Name */}
          <h1 className="font-display text-2xl sm:text-3xl xl:text-[2rem] text-text-primary leading-tight">
            {product.name}
          </h1>

          {/* Collection · Category */}
          <p className="text-xs font-sans text-text-secondary tracking-wider capitalize -mt-2">
            {[product.collection, product.category]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {/* Price row */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              className={[
                'text-2xl font-sans font-semibold',
                product.compareAtPrice ? 'text-sale' : 'text-text-primary',
              ].join(' ')}
            >
              {fmtPrice(effectivePrice, product.currency)}
            </span>
            {product.compareAtPrice && (
              <>
                <span className="text-base font-sans text-text-secondary line-through">
                  {fmtPrice(product.compareAtPrice, product.currency)}
                </span>
                {discount !== null && (
                  <span className="text-[11px] font-sans font-bold text-sale bg-sale/10 px-1.5 py-0.5 rounded-sm">
                    -{discount}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* Short description */}
          <p className="text-sm font-sans text-text-secondary leading-relaxed border-t border-border pt-4">
            {product.shortDescription}
          </p>

          {/* Colour selector */}
          {availableColors.length > 0 && (
            <ColorSelector
              colors={availableColors}
              selectedColor={selectedColor}
              onSelect={handleColorSelect}
            />
          )}

          {/* Size selector */}
          {hasSizes && (
            <SizeSelector
              sizes={sizesForColor}
              availableSizes={availableSizeSet}
              selectedSize={selectedSize}
              onSelect={handleSizeSelect}
              onSizeGuide={() => setSizeGuideOpen(true)}
            />
          )}

          {/* Stock indicator */}
          {activeVariant && stockState && (
            <StockIndicator state={stockState} stock={activeVariant.stock} />
          )}

          {/* Quantity — only when a valid in-stock variant is selected */}
          {activeVariant &&
            stockState !== 'sold-out' &&
            stockState !== 'out-of-stock' && (
              <div>
                <p className="text-xs font-sans font-semibold tracking-[0.14em] uppercase text-text-secondary mb-2.5">
                  Quantity
                </p>
                <QuantitySelector
                  value={quantity}
                  max={maxQty}
                  onChange={setQuantity}
                />
              </div>
            )}

          {/* Add to Bag + Wishlist */}
          <div className="flex flex-col gap-2.5">
            {bagAdded ? (
              <div
                className="w-full h-12 flex items-center justify-center bg-[#2a2a2a] text-white text-[12px] font-sans font-semibold tracking-[0.14em] uppercase"
                role="status"
                aria-live="polite"
              >
                ✓ Added to Bag
              </div>
            ) : (
              <AddToBagButton
                selectedColor={selectedColor}
                selectedSize={hasSizes ? selectedSize : 'ONE SIZE'}
                hasSizes={hasSizes}
                stockState={!product.inStock ? 'sold-out' : stockState}
                onAdd={handleAddToBag}
              />
            )}
            <WishlistButton
              productName={product.name}
              isWishlisted={isWishlisted}
              onToggle={() => toggleWishlist(product.id)}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border" aria-hidden="true" />

          {/* Delivery checker */}
          <DeliveryChecker />

          {/* Trust signals */}
          <ul className="flex flex-col gap-2 text-[11px] font-sans text-text-secondary">
            {[
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                text: 'Secure checkout',
              },
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" /><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" /><path d="M12 12v5" />
                  </svg>
                ),
                text: 'Free returns within 30 days',
              },
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                ),
                text: 'Free delivery above ₹2,999',
              },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                {icon}
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Product information accordions                                   */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div className="mt-10 sm:mt-14 lg:pr-[calc(420px+3rem)] xl:pr-[calc(440px+4rem)]">
        <ProductAccordion items={accordionItems} defaultOpen="description" />
      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Related products                                                 */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <RelatedProducts products={related} />
        </div>
      )}

      {/* ── Size guide modal ──────────────────────────────────────────── */}
      <SizeGuide
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        category={product.category}
      />

      {/* ── Mobile sticky CTA bar ─────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-sm border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        aria-label="Mobile purchase actions"
      >
        <div className="flex gap-2 max-w-lg mx-auto">
          <div className="flex-1">
            <AddToBagButton
              selectedColor={selectedColor}
              selectedSize={hasSizes ? selectedSize : 'ONE SIZE'}
              hasSizes={hasSizes}
              stockState={!product.inStock ? 'sold-out' : stockState}
              onAdd={handleAddToBag}
            />
          </div>
          <button
            type="button"
            aria-pressed={isWishlisted}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={() => toggleWishlist(product.id)}
            className={[
              'w-12 h-12 shrink-0 flex items-center justify-center border',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
              isWishlisted
                ? 'border-text-primary/30 text-text-primary'
                : 'border-border text-text-secondary hover:border-text-primary hover:text-text-primary',
            ].join(' ')}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill={isWishlisted ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
