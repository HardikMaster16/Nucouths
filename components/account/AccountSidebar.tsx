'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Account Sidebar
//
// Every nav item resolves to a real route: /account, /account/orders,
// /account/addresses, /account/details and /wishlist. Shared by every
// /account/* page so the nav is never reimplemented per page.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Link from 'next/link'

export type AccountNavKey = 'overview' | 'orders' | 'wishlist' | 'addresses' | 'details'

interface AccountNavItem {
  key: AccountNavKey
  label: string
  href: string
}

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  { key: 'overview', label: 'Overview', href: '/account' },
  { key: 'orders', label: 'Orders', href: '/account/orders' },
  { key: 'wishlist', label: 'Wishlist', href: '/wishlist' },
  { key: 'addresses', label: 'Addresses', href: '/account/addresses' },
  { key: 'details', label: 'Account Details', href: '/account/details' },
]

interface AccountSidebarProps {
  active: AccountNavKey
  onLogout: () => void
  isLoggingOut: boolean
}

export function AccountSidebar({ active, onLogout, isLoggingOut }: AccountSidebarProps) {
  return (
    <aside className="lg:w-[260px] xl:w-[280px] shrink-0">
      <div className="lg:sticky lg:top-24">
        <h2 className="text-xs font-sans font-semibold tracking-[0.15em] uppercase text-text-secondary mb-4">
          Account
        </h2>

        <nav aria-label="Account navigation">
          <ul className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 -mx-1 px-1 lg:mx-0 lg:px-0">
            {ACCOUNT_NAV_ITEMS.map((item) => {
              const isActive = item.key === active
              return (
                <li key={item.key} className="shrink-0 lg:shrink">
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'block whitespace-nowrap px-3 py-2.5 text-sm font-sans transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded-sm',
                      isActive
                        ? 'bg-text-primary text-white font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-4 pt-4 border-t border-border lg:mt-4">
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="w-full text-left px-3 py-2.5 text-sm font-sans text-text-secondary hover:text-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded-sm disabled:opacity-50"
          >
            {isLoggingOut ? 'Signing Out...' : 'Logout'}
          </button>
        </div>
      </div>
    </aside>
  )
}
