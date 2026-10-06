'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Order History (client)
//
// Shares the account auth gate + sidebar with /account (useAccountAuth,
// AccountSidebar). Orders come from lib/orders.actions.ts's
// getMyOrdersAction — a Server Action that derives the customer from
// requireCustomerSession() and reads real Prisma Order rows scoped by that
// userId, never from a client-supplied id or sessionStorage.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getMyOrdersAction } from '@/lib/orders.actions'
import type { CustomerOrderSummary } from '@/lib/orders.db'
import { formatPrice } from '@/lib/cart-pricing'
import { Button } from '@/components/ui/Button'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { AccountSidebar } from './AccountSidebar'
import { useAccountAuth } from './useAccountAuth'

const ITEMS_PREVIEW_COUNT = 3

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function PackageOutlineIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function OrdersSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 animate-pulse" aria-hidden="true">
      <div className="lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 bg-surface rounded-sm" />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-48 bg-surface rounded-sm" />
        ))}
      </div>
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyOrders() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 border border-border">
      <div className="text-text-secondary/30 mb-6" aria-hidden="true">
        <PackageOutlineIcon />
      </div>
      <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-3">
        No orders yet
      </h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        You haven&apos;t placed an order with NUCOUTHS yet.
      </p>
      <div className="w-full max-w-xs px-4">
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/products')}>
          Start Shopping
        </Button>
      </div>
    </div>
  )
}

// ─── Error state ────────────────────────────────────────────────────────────

function OrdersError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 border border-border">
      <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-3">
        Unable to load orders
      </h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        We couldn&apos;t load your orders right now. Please try again.
      </p>
      <div className="w-full max-w-xs px-4">
        <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  )
}

// ─── Order card ─────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0)
  const previewItems = order.items.slice(0, ITEMS_PREVIEW_COUNT)
  const moreCount = order.items.length - previewItems.length

  return (
    <div className="border border-border p-5 sm:p-6 flex flex-col gap-5">
      {/* Meta */}
      <div className="flex flex-col gap-1.5 border-b border-border pb-4">
        <p className="text-sm font-sans font-semibold text-text-primary">
          Order #{order.orderNumber}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-sans text-text-secondary">
          <span>Placed on {formatOrderDate(order.placedAt)}</span>
          <span>
            Status: <span className="text-text-primary font-medium">{order.status}</span>
          </span>
          <span>
            Items: <span className="text-text-primary font-medium">{itemCount}</span>
          </span>
          <span>
            Total:{' '}
            <span className="text-text-primary font-medium">
              {formatPrice(order.total, order.currency)}
            </span>
          </span>
        </div>
      </div>

      {/* Items preview */}
      <ul className="flex flex-col gap-4">
        {previewItems.map((item) => (
          <li key={item.variantId} className="flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0 w-14 h-[70px] sm:w-16 sm:h-20 overflow-hidden bg-surface">
              <ImageWithFallback image={item.image} fill sizes="64px" />
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <p className="text-sm font-sans font-medium text-text-primary truncate">
                {item.name}
              </p>
              <p className="text-xs font-sans text-text-secondary">
                Colour: {item.color} &nbsp;·&nbsp; Size: {item.size} &nbsp;·&nbsp; Qty: {item.quantity}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {moreCount > 0 && (
        <p className="text-xs font-sans text-text-secondary -mt-2">
          + {moreCount} more item{moreCount === 1 ? '' : 's'}
        </p>
      )}

      {/* Actions */}
      <div className="pt-1">
        <Link
          href={`/account/orders/${order.orderNumber}`}
          className="self-start text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          View Order →
        </Link>
      </div>
    </div>
  )
}

// ─── OrdersListClient ───────────────────────────────────────────────────────

export function OrdersListClient() {
  const { user, isHydrated, isLoggingOut, handleLogout } = useAccountAuth()

  // undefined = not loaded yet (avoids a "No orders yet" flash before the
  // real data has been read).
  const [orders, setOrders] = useState<CustomerOrderSummary[] | undefined>(undefined)
  const [loadError, setLoadError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!isHydrated || !user) return
    let cancelled = false
    getMyOrdersAction()
      .then((result) => {
        if (cancelled) return
        setOrders(result)
        setLoadError(false)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [isHydrated, user, retryToken])

  if (!isHydrated) return <OrdersSkeleton />
  if (!user) return null

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-10 sm:mb-12 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight mb-1.5">
            My Orders
          </h1>
          <p className="text-sm font-sans text-text-secondary">
            View and manage your NUCOUTHS orders.
          </p>
        </div>
        {orders !== undefined && !loadError && (
          <p className="text-sm font-sans text-text-secondary shrink-0 pb-0.5">
            <span className="font-medium text-text-primary">{orders.length}</span>{' '}
            {orders.length === 1 ? 'Order' : 'Orders'}
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        <AccountSidebar active="orders" onLogout={handleLogout} isLoggingOut={isLoggingOut} />

        <div className="flex-1 min-w-0">
          {loadError ? (
            <OrdersError onRetry={() => setRetryToken((t) => t + 1)} />
          ) : orders === undefined ? (
            <div className="flex flex-col gap-4" aria-hidden="true">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-48 bg-surface rounded-sm animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyOrders />
          ) : (
            <div className="flex flex-col gap-5">
              {orders.map((order) => (
                <OrderCard key={order.orderNumber} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
