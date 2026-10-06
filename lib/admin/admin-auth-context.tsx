'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Admin Auth State
//
// Backed by a real, Prisma-authenticated, httpOnly signed session cookie
// (lib/admin/auth/admin-session.actions.ts). There is no client-side
// credential store — this context never checks a password itself, it only
// calls the server action and reflects whatever it reports. useAdminAuth()
// below is the ONLY place admin components should read admin session state
// from — components never touch cookies or a database directly.
//
// Entirely separate from lib/auth-context.tsx (the customer session). A
// signed-in customer is never treated as an admin, and vice versa — the two
// use different signed cookies with different secrets (lib/admin/auth/
// session.ts vs lib/auth/session.ts).
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { adminLoginAction, adminLogoutAction, getCurrentAdminAction } from './auth/admin-session.actions'
import type { AdminUser } from './auth/types'

export interface AdminAuthResult {
  success: boolean
  error?: string
}

interface AdminAuthContextValue {
  admin: AdminUser | null
  /** False until the server session has been checked on mount. */
  isHydrated: boolean
  login: (email: string, password: string) => Promise<AdminAuthResult>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Asks the server whether the httpOnly admin session cookie (if any) is
  // currently valid — never trusts anything stored client-side.
  useEffect(() => {
    let cancelled = false
    getCurrentAdminAction().then((resolved) => {
      if (cancelled) return
      setAdmin(resolved)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<AdminAuthResult> => {
    const result = await adminLoginAction(email, password)
    if (!result.success || !result.admin) {
      // Deliberately generic — never reveals whether the email exists.
      return { success: false, error: result.error ?? 'Invalid email or password.' }
    }

    setAdmin(result.admin)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setAdmin(null)
    void adminLogoutAction()
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({ admin, isHydrated: hydrated, login, logout }),
    [admin, hydrated, login, logout]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  return ctx
}
