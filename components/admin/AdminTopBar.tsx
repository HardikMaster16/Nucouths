'use client'

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/lib/admin/admin-auth-context'
import { ADMIN_NAV_ITEMS, isAdminNavItemActive } from './adminNavItems'
import { MenuIcon, LogoutIcon } from './icons'

interface AdminTopBarProps {
  onOpenMobileNav: () => void
}

function currentPageTitle(pathname: string): string {
  const match = ADMIN_NAV_ITEMS.find((item) => isAdminNavItemActive(pathname, item.href))
  return match?.label ?? 'Admin'
}

export function AdminTopBar({ onOpenMobileNav }: AdminTopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { admin, logout } = useAdminAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = () => {
    setIsLoggingOut(true)
    logout()
    router.push('/admin/login')
  }

  const initials = admin?.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-border">
      <div className="h-full flex items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open admin navigation"
            className="lg:hidden shrink-0 w-9 h-9 flex items-center justify-center text-text-primary hover:bg-surface rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="text-sm sm:text-base font-sans font-semibold text-text-primary truncate">
            {currentPageTitle(pathname)}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {admin && (
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-text-primary text-white flex items-center justify-center text-[11px] font-sans font-semibold shrink-0">
                {initials}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-sans font-medium text-text-primary">{admin.name}</p>
                <p className="text-[11px] font-sans text-text-secondary capitalize">{admin.role}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-sans font-medium text-text-secondary hover:text-text-primary hover:bg-surface rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-50"
          >
            <LogoutIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{isLoggingOut ? 'Signing Out...' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
