'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Cart Page (client)
//
// Reads/writes the shared CartContext (lib/cart-context.tsx). Per-line stock
// caps are looked up live from the existing product-detail data (not stored
// on the cart item), so the quantity selector never lets a shopper exceed
// real stock even if it changed since the item was added.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/Button'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { QuantitySelector } from '@/components/product/QuantitySelector'
import { getProductDetail, findVariant } from '@/lib/product-detail-data'
import { calculateCartTotals, formatPrice, itemDiscountPercent } from '@/lib/cart-pricing'
import { EmptyCart } from '@/components/cart/EmptyCart'
import { OrderTotalsBreakdown } from '@/components/cart/OrderTotalsBreakdown'
import type { CartItem } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Live stock cap for a cart line, looked up from the current product data. */
function getMaxQuantity(item: CartItem): number {
  const product = getProductDetail(item.slug)
  const variant = product ? findVariant(product.variants, item.color, item.size) : undefined
  return variant ? Math.max(variant.stock, item.quantity) : item.quantity
}

// ─── Cart line item ───────────────────────────────────────────────────────────

function CartLine({
  item,
  onRemove,
  onQuantityChange,
}: {
  item: CartItem
  onRemove: (variantId: string) => void
  onQuantityChange: (variantId: string, quantity: number) => void
}) {
  const discount = itemDiscountPercent(item)

  return (
    <li className="py-6 first:pt-0 flex gap-4 sm:gap-5">
      {/* Image */}
      <Link
        href={`/products/${item.slug}`}
        aria-label={`View ${item.name}`}
        className="relative shrink-0 block w-24 sm:w-28 md:w-32 aspect-[3/4] overflow-hidden bg-surface"
      >
        <ImageWithFallback
          image={item.image}
          fill
          sizes="(max-width: 640px) 96px, 128px"
        />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/products/${item.slug}`}
              className="font-sans text-sm sm:text-base font-medium text-text-primary hover:underline underline-offset-2 decoration-text-secondary/50 transition-colors duration-150"
            >
              {item.name}
            </Link>
            <p className="text-xs font-sans text-text-secondary capitalize mt-0.5">
              {item.category}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.variantId)}
            aria-label={`Remove ${item.name} (${item.color}, ${item.size}) from bag`}
            className="shrink-0 text-[11px] font-sans text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
          >
            Remove
          </button>
        </div>

        <p className="text-xs font-sans text-text-secondary">
          Colour: {item.color} &nbsp;·&nbsp; Size: {item.size}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={[
              'text-sm font-sans font-medium',
              item.compareAtPrice ? 'text-sale' : 'text-text-primary',
            ].join(' ')}
          >
            {formatPrice(item.price, item.currency)}
          </span>
          {item.compareAtPrice && (
            <>
              <span className="text-xs font-sans text-text-secondary line-through">
                {formatPrice(item.compareAtPrice, item.currency)}
              </span>
              <span className="text-[10px] font-sans font-bold text-sale bg-sale/10 px-1 py-0.5 rounded-sm">
                -{discount}%
              </span>
            </>
          )}
        </div>

        <div className="mt-1 flex items-center gap-4 flex-wrap">
          <QuantitySelector
            value={item.quantity}
            max={getMaxQuantity(item)}
            onChange={(q) => onQuantityChange(item.variantId, q)}
          />
          <p className="text-xs font-sans text-text-secondary">
            Item total:{' '}
            <span className="text-text-primary font-medium">
              {formatPrice(item.price * item.quantity, item.currency)}
            </span>
          </p>
        </div>
      </div>
    </li>
  )
}

// ─── Order summary ────────────────────────────────────────────────────────────

function OrderSummary({
  currency,
  totals,
}: {
  currency: string
  totals: ReturnType<typeof calculateCartTotals>
}) {
  const router = useRouter()

  return (
    <div className="border border-border p-6 sm:p-7 flex flex-col gap-5 md:sticky md:top-[72px] md:self-start">
      <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
        Order Summary
      </h2>

      <OrderTotalsBreakdown currency={currency} totals={totals} />

      <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/checkout')}>
        Proceed to Checkout
      </Button>
    </div>
  )
}

// ─── CartClient ───────────────────────────────────────────────────────────────

export function CartClient() {
  const { items, itemCount, isHydrated, removeItem, updateQuantity } = useCart()

  // Avoid briefly rendering "Your bag is empty" for a returning shopper
  // whose cart hasn't finished loading from localStorage yet.
  if (!isHydrated) return null

  if (items.length === 0) {
    return <EmptyCart />
  }

  const currency = items[0].currency
  const totals = calculateCartTotals(items)

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-8 sm:mb-10 border-b border-border pb-5 sm:pb-6">
        <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight">
          Shopping Bag
        </h1>
        <p className="text-sm font-sans text-text-secondary shrink-0 pb-0.5">
          <span className="font-medium text-text-primary">{itemCount}</span>{' '}
          {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 md:gap-8 lg:gap-12 xl:gap-16 items-start">
        <ul className="divide-y divide-border" aria-label="Items in your bag">
          {items.map((item) => (
            <CartLine
              key={item.variantId}
              item={item}
              onRemove={removeItem}
              onQuantityChange={updateQuantity}
            />
          ))}
        </ul>

        <OrderSummary currency={currency} totals={totals} />
      </div>
    </div>
  )
}
