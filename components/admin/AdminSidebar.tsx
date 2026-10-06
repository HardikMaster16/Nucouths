'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV_ITEMS, isAdminNavItemActive } from './adminNavItems'

interface AdminSidebarProps {
  /** Called after every nav click — lets the mobile drawer close itself. */
  onNavigate?: () => void
}

/** The sidebar's actual nav content — reused as-is by both the always-visible
 *  desktop rail and the mobile drawer (components/admin/AdminMobileDrawer.tsx)
 *  so the two never drift out of sync. */
export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <Link href="/admin" onClick={onNavigate} className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/text-logo.svg" alt="Nucouths" className="h-4 w-auto" />
        </Link>
        <span className="ml-2 text-[10px] font-sans font-semibold tracking-[0.15em] uppercase text-text-secondary border border-border px-1.5 py-0.5 rounded-sm">
          Admin
        </span>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="flex flex-col gap-0.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isAdminNavItemActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-sans transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                    active
                      ? 'bg-text-primary text-white font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface',
                  ].join(' ')}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
