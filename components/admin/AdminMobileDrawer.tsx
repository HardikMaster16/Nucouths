'use client'

import React, { useEffect, useRef } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { XIcon } from './icons'

interface AdminMobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

// Mirrors components/layout/MobileMenu.tsx's established pattern: focus
// trap, Escape to close, body-scroll lock, focus restored on close.
export function AdminMobileDrawer({ isOpen, onClose }: AdminMobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement as HTMLElement
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
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
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={[
          'fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-white z-50 lg:hidden',
          'transition-transform duration-300 ease-in-out shadow-2xl',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close admin navigation"
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <XIcon className="w-[18px] h-[18px]" />
        </button>
        <AdminSidebar onNavigate={onClose} />
      </div>
    </>
  )
}
