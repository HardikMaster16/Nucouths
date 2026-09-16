'use client'

// Single shared "Continue with Google" control for /login and /register —
// one implementation of the Google auth call so it's never duplicated.
// loginWithGoogle() (lib/auth-context.tsx) never fakes success; this button
// just reflects whatever it honestly reports.

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  )
}

interface GoogleAuthButtonProps {
  redirectTarget: string
  onErrorChange: (message: string | null) => void
}

export function GoogleAuthButton({ redirectTarget, onErrorChange }: GoogleAuthButtonProps) {
  const router = useRouter()
  const { loginWithGoogle } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    onErrorChange(null)
    const result = await loginWithGoogle()
    if (result.success) {
      router.replace(redirectTarget)
      return
    }
    onErrorChange(result.error ?? 'Something went wrong. Please try again.')
    setIsSubmitting(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      className="w-full h-12 flex items-center justify-center gap-2.5 border border-border text-sm font-sans font-medium text-text-primary hover:border-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <GoogleIcon />
      {isSubmitting ? 'Connecting...' : 'Continue with Google'}
    </button>
  )
}
