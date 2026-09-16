'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useScrolled } from '@/hooks/useScrolled'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'
import { useAuth } from '@/lib/auth-context'
import type { NavItem } from '@/lib/types'

interface HeaderProps {
  navItems: NavItem[]
}

// ─── Inline SVG Icons (Lucide-style, strokeWidth 1.5) ────────────────────────

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="16" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

// ─── Nav Icon Button ──────────────────────────────────────────────────────────

function NavIconBtn({
  href,
  label,
  badge,
  active = false,
  onClick,
  children,
  className = '',
}: {
  href?: string
  label: string
  badge?: number
  /** Highlights the icon to indicate the shopper is on its destination page. */
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  const base = [
    'relative flex items-center justify-center w-9 h-9 rounded-sm transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
    active ? 'text-white bg-white/10' : 'text-white/75 hover:text-white hover:bg-white/10',
  ].join(' ')

  const badgeEl = badge && badge > 0 ? (
    <span
      aria-hidden="true"
      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
    >
      {badge > 9 ? '9+' : badge}
    </span>
  ) : null

  if (href) {
    return (
      <Link href={href} aria-label={label} aria-current={active ? 'page' : undefined} className={`${base} ${className}`}>
        {children}
        {badgeEl}
      </Link>
    )
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={`${base} ${className}`}>
      {children}
      {badgeEl}
    </button>
  )
}

// ─── Desktop Search Panel ─────────────────────────────────────────────────────

function SearchPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Small delay lets the transition start before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  return (
    <div
      className={[
        'absolute top-full left-0 right-0 z-20 overflow-hidden',
        'bg-white border-b border-border shadow-dropdown',
        'transition-all duration-300 ease-in-out',
        isOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
      ].join(' ')}
      aria-hidden={!isOpen}
      role="search"
    >
      <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <span className="text-text-secondary shrink-0">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search for products, styles, collections…"
          tabIndex={isOpen ? 0 : -1}
          className="flex-1 bg-transparent text-base font-sans text-text-primary placeholder:text-text-secondary outline-none border-none"
          aria-label="Search products"
        />
        <button
          type="button"
          onClick={onClose}
          tabIndex={isOpen ? 0 : -1}
          aria-label="Close search"
          className="shrink-0 flex items-center gap-1 text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          <XIcon />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header({ navItems }: HeaderProps) {
  const { itemCount: cartCount } = useCart()
  const { itemCount: wishlistCount } = useWishlist()
  const { user } = useAuth()
  const pathname = usePathname()
  const scrolled = useScrolled(8)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const accountHref = user ? '/account' : '/login'
  const accountActive = pathname === '/login' || pathname === '/account'

  return (
    <>
      <header
        className={[
          'sticky top-0 z-30 bg-header-bg text-header-text',
          'transition-shadow duration-300',
          scrolled ? 'shadow-[0_1px_0_rgba(255,255,255,0.08)]' : '',
        ].join(' ')}
        role="banner"
      >
        {/* ── Main row ──────────────────────────────────────── */}
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-14 lg:h-[60px]">

            {/* LEFT — hamburger (≤lg) | desktop nav (lg+) */}
            <div className="flex items-center lg:flex-1">
              {/* Mobile hamburger */}
              <NavIconBtn
                label="Open navigation menu"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden mr-1"
              >
                <MenuIcon />
              </NavIconBtn>

              {/* Desktop nav links */}
              <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative py-1 text-[11px] font-sans font-medium tracking-[0.12em] uppercase text-white/75 hover:text-white transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* CENTER — Logo (absolutely centred on desktop, flex-centred on mobile) */}
            <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:transform-none lg:flex-none">
              <Link
                href="/"
                aria-label="Nucouths — return to homepage"
                className="block font-display text-lg sm:text-xl lg:text-2xl tracking-[0.22em] uppercase text-white hover:text-accent transition-colors duration-250 whitespace-nowrap"
              >
                Nucouths
              </Link>
            </div>

            {/* RIGHT — action icons */}
            <div className="flex items-center gap-0.5 lg:flex-1 lg:justify-end">
              {/* Search */}
              <NavIconBtn
                label={searchOpen ? 'Close search' : 'Open search'}
                onClick={() => setSearchOpen((o) => !o)}
              >
                {searchOpen ? <XIcon /> : <SearchIcon />}
              </NavIconBtn>

              {/* Account (sm+) */}
              <NavIconBtn
                href={accountHref}
                label={user ? 'My Account' : 'Sign In'}
                active={accountActive}
                className="hidden sm:flex"
              >
                <UserIcon />
              </NavIconBtn>

              {/* Wishlist (sm+) */}
              <NavIconBtn
                href="/wishlist"
                label={wishlistCount > 0 ? `Wishlist (${wishlistCount} items)` : 'Wishlist'}
                badge={wishlistCount}
                className="hidden sm:flex"
              >
                <HeartIcon />
              </NavIconBtn>

              {/* Cart */}
              <NavIconBtn
                href="/cart"
                label={cartCount > 0 ? `Shopping bag (${cartCount} items)` : 'Shopping bag'}
                badge={cartCount}
              >
                <BagIcon />
              </NavIconBtn>
            </div>
          </div>
        </div>

        {/* Desktop search panel — slides down below header */}
        <div className="relative hidden lg:block">
          <SearchPanel isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>

        {/* Mobile search bar — always visible below main row on mobile */}
        <div className="lg:hidden border-t border-white/[0.08]">
          <div className="flex items-center gap-3 px-4 py-2 h-10">
            <span className="shrink-0 text-white/40" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="Search products…"
              className="flex-1 min-w-0 bg-transparent text-sm font-sans text-white placeholder:text-white/35 outline-none border-none"
              aria-label="Search products"
            />
          </div>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={navItems}
      />
    </>
  )
}
