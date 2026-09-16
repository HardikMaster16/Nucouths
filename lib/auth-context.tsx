'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Auth State
//
// No backend/auth provider exists yet in this project (no API routes, no auth
// library, no session store — confirmed by inspection). This is a clean,
// honest abstraction: the Context/hook shape a real backend can be wired into
// later, mirroring the lib/cart-context.tsx / lib/wishlist-context.tsx pattern
// (localStorage-backed `user`, SSR-safe hydration gate).
//
// login()/loginWithGoogle()/register() deliberately never fabricate success —
// they simulate the async round-trip and then honestly report that no
// authentication backend is connected yet. Swap the body of these functions
// for real API calls when one exists; nothing else needs to change.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'

const AUTH_STORAGE_KEY = 'nucouths-auth-user'

export interface AuthUser {
  email: string
}

export interface AuthResult {
  success: boolean
  error?: string
}

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
}

interface AuthContextValue {
  user: AuthUser | null
  /** False until the persisted session has been read from localStorage. */
  isHydrated: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithGoogle: () => Promise<AuthResult>
  register: (input: RegisterInput) => Promise<AuthResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Read a persisted session after mount only — localStorage isn't available
  // during SSR, and starting from null on both sides avoids a hydration
  // mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // corrupt or inaccessible storage — start signed out
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      if (user) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    } catch {
      // storage unavailable (private mode, quota) — session still works in-memory
    }
  }, [user, hydrated])

  // Params kept in the signature for the real API call this will make once a backend exists.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    // Simulates the network round-trip a real sign-in request would take.
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    return {
      success: false,
      error: 'Sign-in isn’t available yet — our authentication service is coming soon.',
    }
  }, [])

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    return {
      success: false,
      error: 'Google sign-in isn’t configured yet.',
    }
  }, [])

  // Params kept in the signature for the real API call this will make once a backend exists.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const register = useCallback(async (input: RegisterInput): Promise<AuthResult> => {
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    return {
      success: false,
      error: 'Account creation isn’t available yet — our registration service is coming soon.',
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isHydrated: hydrated, login, loginWithGoogle, register, logout }),
    [user, hydrated, login, loginWithGoogle, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
