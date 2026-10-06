'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Shared Account Auth Gate
//
// One implementation of "redirect unauthenticated visitors to /login" and
// "logout, then leave" so every protected /account/* page shares identical
// logic instead of each page reimplementing it. Reuses the existing
// AuthContext (lib/auth-context.tsx) — no second auth framework.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function useAccountAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isHydrated, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Not authenticated once the session has finished hydrating — bounce to
  // /login, same redirect-back convention LoginClient reads on success.
  useEffect(() => {
    if (isHydrated && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [isHydrated, user, pathname, router])

  const handleLogout = () => {
    setIsLoggingOut(true)
    logout()
    router.push('/login')
  }

  return { user, isHydrated, isLoggingOut, handleLogout }
}
