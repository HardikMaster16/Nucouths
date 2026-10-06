'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Account Overview
//
// Orders, Addresses and Account Details now all have their own real routes
// (/account/orders, /account/orders/[id], /account/addresses,
// /account/details). Personal Information here reuses PersonalInfoCard —
// the same component /account/details renders — so the user's profile
// fields are never duplicated across the two pages.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/cart-pricing'
import { useAddresses } from '@/lib/address-context'
import { PersonalInfoCard } from './PersonalInfoCard'
import type { AuthUser } from '@/lib/auth-context'
import type { CustomerOrderSummary } from '@/lib/orders.db'

interface AccountOverviewProps {
  user: AuthUser
  orders: CustomerOrderSummary[]
  wishlistCount: number
}

// ─── Small building blocks ─────────────────────────────────────────────────

function SummaryCard({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="border border-border p-6 flex flex-col gap-3">
      <h3 className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary">
        {title}
      </h3>
      <p className="text-sm font-sans text-text-secondary flex-1">{description}</p>
      {action}
    </div>
  )
}

function CardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="self-start text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
    >
      {label}
    </Link>
  )
}

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Overview ───────────────────────────────────────────────────────────────

export function AccountOverview({ user, orders, wishlistCount }: AccountOverviewProps) {
  const router = useRouter()
  const { addresses, isHydrated: addressesHydrated } = useAddresses()

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-14 sm:gap-16">
      {/* ── Overview ─────────────────────────────────────────────── */}
      <section id="overview">
        <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-2">
          Account Overview
        </h2>
        <p className="text-sm font-sans text-text-secondary max-w-xl mb-8">
          Manage your orders, personal information, saved addresses and wishlist from your account.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <SummaryCard
            title="Orders"
            description="View your order history"
            action={<CardLink href="/account/orders" label="View Orders" />}
          />
          <SummaryCard
            title="Wishlist"
            description={wishlistCount > 0 ? `${wishlistCount} item${wishlistCount === 1 ? '' : 's'} saved` : "Items you've saved"}
            action={<CardLink href="/wishlist" label="View Wishlist" />}
          />
          <SummaryCard
            title="Addresses"
            description={
              !addressesHydrated
                ? 'Manage your saved addresses'
                : addresses.length > 0
                ? `${addresses.length} saved address${addresses.length === 1 ? '' : 'es'}`
                : 'No saved addresses'
            }
            action={<CardLink href="/account/addresses" label="Manage Addresses" />}
          />
          <SummaryCard
            title="Account Details"
            description="Update your personal information"
            action={<CardLink href="/account/details" label="View Details" />}
          />
        </div>
      </section>

      {/* ── Recent Orders ────────────────────────────────────────── */}
      <section id="orders" className="scroll-mt-24">
        <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-6">
          Recent Orders
        </h2>

        {orders.length === 0 ? (
          <div className="border border-border p-8 sm:p-10 flex flex-col items-center text-center gap-4">
            <div>
              <p className="text-sm font-sans font-medium text-text-primary mb-1">No orders yet</p>
              <p className="text-sm font-sans text-text-secondary">
                You haven&apos;t placed an order with NUCOUTHS yet.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => router.push('/products')}>
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.slice(0, 3).map((order) => {
              const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0)
              return (
                <div key={order.orderNumber} className="border border-border p-5 sm:p-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-sans font-semibold text-text-primary">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-xs font-sans font-medium tracking-wide uppercase text-text-secondary">
                      {order.status}
                    </p>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 text-sm font-sans text-text-secondary">
                    <span>{formatOrderDate(order.placedAt)}</span>
                    <span>
                      {itemCount} item{itemCount === 1 ? '' : 's'}
                    </span>
                    <span className="text-text-primary font-medium">
                      {formatPrice(order.total, order.currency)}
                    </span>
                  </div>

                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="self-start text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
                  >
                    View Order →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Personal Information ────────────────────────────────── */}
      <section id="personal-information" className="scroll-mt-24">
        <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mb-6">
          Personal Information
        </h2>

        <PersonalInfoCard user={user} />
      </section>

      {/* ── Quick Links ──────────────────────────────────────────── */}
      <section aria-label="Quick links" className="border-t border-border pt-8">
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {[
            { label: 'View Orders', href: '/account/orders' },
            { label: 'View Wishlist', href: '/wishlist' },
            { label: 'Manage Addresses', href: '/account/addresses' },
            { label: 'Account Details', href: '/account/details' },
          ].map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-sm font-sans text-text-secondary hover:text-text-primary underline underline-offset-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
