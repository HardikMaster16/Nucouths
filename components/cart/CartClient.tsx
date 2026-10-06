'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Cart Page (client)
//
// Reads/writes the shared CartContext (lib/cart-context.tsx). Per-line stock
// caps come from CartItem.stock — for a signed-in customer that's the live
// ProductVariant.stock re-read from Prisma on every cart load/mutation
// (lib/cart.db.ts), never a static/mock lookup; the quantity selector's
// enforcement is a UX convenience either way, since the server independently
// re-validates and caps stock on every cart/order mutation regardless of
// what the client requests.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/Button'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { QuantitySelector } from '@/components/product/QuantitySelector'
import { calculateCartTotals, formatPrice, itemDiscountPercent } from '@/lib/cart-pricing'
import { EmptyCart } from '@/components/cart/EmptyCart'
import { OrderTotalsBreakdown } from '@/components/cart/OrderTotalsBreakdown'
import { Skeleton } from '@/components/ui/Skeleton'
import { AlertIcon } from '@/components/admin/icons'
import type { CartItem } from '@/lib/types'

// ─── Error banner ─────────────────────────────────────────────────────────────
// Same role="alert" pattern components/checkout/CheckoutClient.tsx already
// uses for its "items no longer available" notice — surfaces the safe
// message lib/cart-context.tsx's `error` carries from a failed cart
// mutation (add/remove/quantity update), never a raw server error (see that
// file's own docstring for why reading it here is safe).

function CartErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="mb-6 border border-sale/30 bg-sale/5 text-sale rounded-sm p-3 flex items-start gap-2.5 text-sm font-sans"
    >
      <AlertIcon className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="shrink-0 text-current opacity-70 hover:opacity-100 text-xs font-sans font-medium uppercase tracking-wide focus-visible:outline-none"
      >
        Dismiss
      </button>
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex items-end justify-between gap-4 mb-8 sm:mb-10 border-b border-border pb-5 sm:pb-6">
        <Skeleton className="h-8 sm:h-9 w-40" />
        <Skeleton className="h-4 w-16 shrink-0" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 md:gap-8 lg:gap-12 xl:gap-16 items-start">
        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-4 sm:gap-5">
              <Skeleton className="shrink-0 w-24 sm:w-28 md:w-32 aspect-[3/4] rounded-none" />
              <div className="flex-1 flex flex-col gap-2.5 pt-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** The quantity selector's cap — never below the line's current quantity,
 *  so an already-in-cart quantity (e.g. added before stock dropped) is
 *  never rendered as invalid, just unable to increase further. Falls back
 *  to the current quantity (no further increase allowed) for a guest cart
 *  line persisted before CartItem gained `stock`, rather than propagating
 *  a NaN cap from missing localStorage data. */
function getMaxQuantity(item: CartItem): number {
  return typeof item.stock === 'number' ? Math.max(item.stock, item.quantity) : item.quantity
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
  const { items, itemCount, isHydrated, removeItem, updateQuantity, error, clearError } = useCart()

  // Avoid briefly rendering "Your bag is empty" for a returning shopper
  // whose cart hasn't finished loading from localStorage yet.
  if (!isHydrated) return <CartSkeleton />

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

      {error && <CartErrorBanner message={error} onDismiss={clearError} />}

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
