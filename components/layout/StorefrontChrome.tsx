'use client'

import { usePathname } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Storefront Chrome Gate
//
// app/layout.tsx is the one root layout (it owns <html>/<body>, so it can't
// be split per-section without moving every existing storefront route into
// a route group). /admin/* is a separate application area with its own
// chrome (components/admin/AdminShell.tsx) and must never show the customer
// AnnouncementBar/Header/Footer. This is the minimal way to keep both under
// one root layout: skip rendering the storefront chrome slots on /admin
// routes, no route restructuring, zero behavior change for every existing
// storefront route (pathname never starts with /admin there).
// ─────────────────────────────────────────────────────────────────────────────

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null
  return <>{children}</>
}
