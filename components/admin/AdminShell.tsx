'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Shell
//
// The reusable chrome every /admin/* page (except /admin/login) renders
// inside: desktop sidebar + mobile drawer + top bar + gated main content.
// Mirrors components/account/useAccountAuth.ts's redirect-gate pattern, but
// against the separate admin session (useAdminAuth(), never useAuth()) — a
// signed-in customer has no admin session and is never granted access here.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/lib/admin/admin-auth-context'
import { AdminSidebar } from './AdminSidebar'
import { AdminMobileDrawer } from './AdminMobileDrawer'
import { AdminTopBar } from './AdminTopBar'

function AdminShellSkeleton() {
  return (
    <div className="min-h-screen flex" aria-hidden="true">
      <div className="hidden lg:block w-64 shrink-0 border-r border-border bg-white" />
      <div className="flex-1 min-w-0">
        <div className="h-16 border-b border-border bg-white" />
        <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
          <div className="h-4 w-40 bg-surface rounded-sm" />
        </div>
      </div>
    </div>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, isHydrated } = useAdminAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (isHydrated && !admin) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [isHydrated, admin, pathname, router])

  // Close the mobile drawer on every route change.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  if (!isHydrated) return <AdminShellSkeleton />
  if (!admin) return null // useEffect above is already redirecting to /admin/login

  return (
    <div className="min-h-screen flex bg-surface/40">
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border bg-white">
        <div className="sticky top-0 h-screen">
          <AdminSidebar />
        </div>
      </aside>

      <AdminMobileDrawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main id="admin-main-content" className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
