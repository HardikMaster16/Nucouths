'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Auth State
//
// login()/register()/logout() are backed entirely by the real, server-side
// customer auth system (lib/auth/customer-auth.actions.ts, Prisma-backed,
// httpOnly session cookie) — see that file for the actual credential
// checking, password hashing, and session issuance; nothing here ever sees
// a plaintext password or a password hash, and nothing here reads or
// writes an authentication session to localStorage. useAuth() below is the
// ONLY place the rest of the app should read auth state from.
//
// updateProfile()/changePassword() are also backed by the real server
// actions (lib/auth/customer-auth.actions.ts's updateCustomerProfileAction/
// changeCustomerPasswordAction) — userId always comes from the session
// cookie server-side, never from client input. /account/orders and
// /account/addresses are unmigrated (out of scope) and still reflect only
// the demo account's mock data regardless of who is actually signed in.
//
// loginWithGoogle() still deliberately never fabricates success — Google
// sign-in isn't implemented.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  changeCustomerPasswordAction,
  getCurrentCustomerAction,
  loginCustomerAction,
  logoutCustomerAction,
  registerCustomerAction,
  updateCustomerProfileAction,
} from './auth/customer-auth.actions'
import type { User } from './auth/types'

export type AuthUser = User

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

export interface ProfileUpdateInput {
  firstName: string
  lastName: string
  phone: string
}

interface AuthContextValue {
  user: AuthUser | null
  /** False until the server session has been checked on mount. */
  isHydrated: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithGoogle: () => Promise<AuthResult>
  register: (input: RegisterInput) => Promise<AuthResult>
  logout: () => void
  /** Updates first/last name and phone (never email, id, or role) and
   *  refreshes the authenticated user in place — see lib/auth/customer-
   *  auth.actions.ts's updateCustomerProfileAction. */
  updateProfile: (input: ProfileUpdateInput) => Promise<AuthResult>
  /** Validates the current password before persisting the new one. Never
   *  handles plaintext outside lib/auth/customer-auth.actions.ts. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Asks the server whether the httpOnly customer session cookie (if any)
  // is currently valid — getCurrentCustomerAction re-resolves the user from
  // the database on every call, so this is authoritative and survives a
  // refresh correctly. Never trusts anything stored client-side.
  useEffect(() => {
    let cancelled = false

    getCurrentCustomerAction().then((current) => {
      if (cancelled) return
      setUser(current)
      setHydrated(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await loginCustomerAction(email, password)
    if (!result.success || !result.user) {
      // Deliberately generic — never reveals whether the email exists.
      return { success: false, error: result.error ?? 'Invalid email or password.' }
    }

    setUser(result.user)
    return { success: true }
  }, [])

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    return {
      success: false,
      error: 'Google sign-in isn’t configured yet.',
    }
  }, [])

  const register = useCallback(async (input: RegisterInput): Promise<AuthResult> => {
    const result = await registerCustomerAction(input)
    if (!result.success || !result.user) {
      return { success: false, error: result.error ?? "Couldn't create your account. Please try again." }
    }

    setUser(result.user)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    void logoutCustomerAction()
  }, [])

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput): Promise<AuthResult> => {
      if (!user) return { success: false, error: 'You need to be signed in to do that.' }
      const result = await updateCustomerProfileAction(input)
      if (!result.success || !result.user) {
        return { success: false, error: result.error ?? 'Something went wrong. Please try again.' }
      }
      setUser(result.user)
      return { success: true }
    },
    [user]
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
      if (!user) return { success: false, error: 'You need to be signed in to do that.' }
      return changeCustomerPasswordAction(currentPassword, newPassword)
    },
    [user]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isHydrated: hydrated,
      login,
      loginWithGoogle,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [user, hydrated, login, loginWithGoogle, register, logout, updateProfile, changePassword]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
