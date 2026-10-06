'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Account Dashboard (client)
//
// Reuses the existing AuthContext (lib/auth-context.tsx) — no second auth
// framework. Unauthenticated visitors are redirected to /login the same way
// LoginClient/RegisterClient redirect *away* from themselves once signed in
// (mirrored `redirect` query param), and logout goes through the real
// AuthContext.logout() before navigating away, so the session is actually
// cleared rather than just leaving the page.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useWishlist } from '@/lib/wishlist-context'
import { getMyOrdersAction } from '@/lib/orders.actions'
import type { CustomerOrderSummary } from '@/lib/orders.db'
import { Button } from '@/components/ui/Button'
import { AccountSidebar } from './AccountSidebar'
import { AccountOverview } from './AccountOverview'
import { useAccountAuth } from './useAccountAuth'

// ─── Skeleton ───────────────────────────────────────────────────────────────

function AccountSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between gap-4 mb-10 sm:mb-12 border-b border-border pb-6">
        <div>
          <div className="h-8 w-40 bg-surface rounded-sm mb-3" />
          <div className="h-4 w-56 bg-surface rounded-sm" />
        </div>
        <div className="h-4 w-16 bg-surface rounded-sm" />
      </div>
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        <div className="lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-surface rounded-sm" />
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="h-6 w-48 bg-surface rounded-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Error state ────────────────────────────────────────────────────────────

function AccountError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 sm:py-28">
      <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight mb-3">
        Something went wrong
      </h1>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-8">
        We couldn&apos;t load your account information. Please try again.
      </p>
      <div className="w-full max-w-xs">
        <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  )
}

// ─── AccountClient ──────────────────────────────────────────────────────────

export function AccountClient() {
  const { user, isHydrated, isLoggingOut, handleLogout } = useAccountAuth()
  const { itemCount: wishlistCount } = useWishlist()

  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])
  const [loadError, setLoadError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  // Loads this customer's real orders (lib/orders.actions.ts's
  // getMyOrdersAction — Prisma, scoped by requireCustomerSession()'s
  // userId). Guarded so an unexpected failure surfaces the error state
  // instead of crashing.
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

  // Session still loading — show a skeleton rather than a misleading empty
  // dashboard.
  if (!isHydrated) return <AccountSkeleton />

  // Not authenticated — the effect above is already redirecting to /login.
  if (!user) return null

  if (loadError) {
    return <AccountError onRetry={() => setRetryToken((t) => t + 1)} />
  }

  const displayName = user.firstName?.trim() || user.email.split('@')[0]

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-10 sm:mb-12 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight mb-1.5">
            My Account
          </h1>
          <p className="text-sm font-sans text-text-secondary">Welcome back, {displayName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="shrink-0 text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 hover:no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded disabled:opacity-50"
        >
          {isLoggingOut ? 'Signing Out...' : 'Logout'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        <AccountSidebar active="overview" onLogout={handleLogout} isLoggingOut={isLoggingOut} />
        <AccountOverview user={user} orders={orders} wishlistCount={wishlistCount} />
      </div>
    </div>
  )
}
