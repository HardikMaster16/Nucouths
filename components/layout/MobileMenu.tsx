'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { NavItem } from '@/lib/types'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  navItems: NavItem[]
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap & close on Escape
  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement as HTMLElement
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()

      if (e.key === 'Tab' && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-350 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          'fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white z-50 flex flex-col',
          'transition-transform duration-350 ease-in-out lg:hidden',
          'shadow-dropdown',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-display text-lg tracking-widest text-text-primary uppercase">
            Nucouths
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-2 -mr-2 text-text-primary hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-text-secondary pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="Search products..."
              className="w-full pl-9 pr-4 h-10 bg-surface text-sm font-sans text-text-primary placeholder:text-text-secondary border border-border focus:outline-none focus:border-text-primary transition-colors duration-200"
              aria-label="Search products"
            />
          </div>
        </div>

        {/* Navigation links */}
        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between px-5 py-3.5 text-sm font-sans font-medium tracking-wider uppercase text-text-primary hover:bg-surface transition-colors duration-150"
              >
                {item.label}
              </Link>

              {item.children && item.children.length > 0 && (
                <div className="bg-surface/60 border-t border-b border-border/50">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className="block px-8 py-2.5 text-sm font-sans text-text-secondary hover:text-text-primary transition-colors duration-150"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer links */}
        <div className="px-5 py-4 border-t border-border space-y-3">
          <Link
            href="/account"
            onClick={onClose}
            className="block text-sm font-sans text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            My Account
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className="block text-sm font-sans text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Wishlist
          </Link>
          <Link
            href="/contact"
            onClick={onClose}
            className="block text-sm font-sans text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Help & Contact
          </Link>
        </div>
      </div>
    </>
  )
}
