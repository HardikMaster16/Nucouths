import type { Metadata } from 'next'
import { AdminAuthProvider } from '@/lib/admin/admin-auth-context'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Root Layout
//
// Wraps every /admin/* route (including /admin/login) in the isolated admin
// auth provider — nothing here renders sidebar/top-bar chrome or a route
// guard; that's components/admin/AdminShell.tsx, applied only to the
// protected route group at app/admin/(dashboard)/layout.tsx, so /admin/login
// itself stays reachable while signed out.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'Admin — Nucouths',
    template: '%s | Nucouths Admin',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>
}
