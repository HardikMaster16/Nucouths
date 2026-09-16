import React from 'react'
import Link from 'next/link'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { OrderTotalsBreakdown } from '@/components/cart/OrderTotalsBreakdown'
import { PromoCode } from './PromoCode'
import { formatPrice } from '@/lib/cart-pricing'
import type { CartItem } from '@/lib/types'
import type { CartTotals } from '@/lib/cart-pricing'

// ─── Trust badges ─────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ReturnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
      <path d="M12 12v5" />
    </svg>
  )
}

function TrustBadges() {
  const badges = [
    { icon: <LockIcon />, text: 'Secure checkout' },
    { icon: <ShieldCheckIcon />, text: 'Your payment information is protected' },
    { icon: <ReturnIcon />, text: 'Easy 30-day returns' },
  ]
  return (
    <ul className="flex flex-col gap-2 text-[11px] font-sans text-text-secondary">
      {badges.map(({ icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          {icon}
          {text}
        </li>
      ))}
    </ul>
  )
}

// ─── Line item (read-only) ────────────────────────────────────────────────────

function SummaryLine({ item }: { item: CartItem }) {
  return (
    <li className="py-4 first:pt-0 flex gap-3">
      <Link
        href={`/products/${item.slug}`}
        aria-label={`View ${item.name}`}
        className="relative shrink-0 block w-16 sm:w-20 aspect-[3/4] overflow-hidden bg-surface"
      >
        <ImageWithFallback image={item.image} fill sizes="80px" />
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-text-primary text-white text-[10px] font-sans font-semibold flex items-center justify-center"
        >
          {item.quantity}
        </span>
      </Link>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <Link
          href={`/products/${item.slug}`}
          className="text-sm font-sans font-medium text-text-primary hover:underline underline-offset-2 decoration-text-secondary/50 transition-colors duration-150 line-clamp-2"
        >
          {item.name}
        </Link>
        <p className="text-xs font-sans text-text-secondary">
          {item.color} &nbsp;·&nbsp; {item.size} &nbsp;·&nbsp; Qty {item.quantity}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span
            className={[
              'text-xs font-sans font-medium',
              item.compareAtPrice ? 'text-sale' : 'text-text-primary',
            ].join(' ')}
          >
            {formatPrice(item.price, item.currency)}
          </span>
          {item.compareAtPrice && (
            <span className="text-[11px] font-sans text-text-secondary line-through">
              {formatPrice(item.compareAtPrice, item.currency)}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm font-sans font-medium text-text-primary shrink-0 self-start">
        {formatPrice(item.price * item.quantity, item.currency)}
      </p>
    </li>
  )
}

// ─── CheckoutSummary ──────────────────────────────────────────────────────────

export function CheckoutSummary({
  items,
  currency,
  totals,
}: {
  items: CartItem[]
  currency: string
  totals: CartTotals
}) {
  return (
    <div className="border border-border p-6 sm:p-7 flex flex-col gap-6 md:sticky md:top-[72px] md:self-start">
      <h2 className="font-display text-xl sm:text-2xl text-text-primary leading-tight">
        Order Summary
      </h2>

      <ul className="divide-y divide-border" aria-label="Items in your order">
        {items.map((item) => (
          <SummaryLine key={item.variantId} item={item} />
        ))}
      </ul>

      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <OrderTotalsBreakdown currency={currency} totals={totals} />
      </div>

      <PromoCode />

      <div className="border-t border-border pt-5">
        <TrustBadges />
      </div>
    </div>
  )
}
