'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Login Page (client)
//
// Reads/writes the shared AuthContext (lib/auth-context.tsx). Reuses the
// checkout FormField/fieldInputClass, the shared email validator, and the
// shared auth UI (PasswordField/GoogleAuthButton/AuthDivider/SecurityMessage)
// — /register uses the exact same pieces. login()/loginWithGoogle() never
// fabricate success — see lib/auth-context.tsx for why.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { PasswordField } from '@/components/auth/PasswordField'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { SecurityMessage } from '@/components/auth/SecurityMessage'
import { isValidEmail, isRequired } from '@/lib/checkout-validation'
import { Button } from '@/components/ui/Button'

// ─── LoginClient ──────────────────────────────────────────────────────────────

export function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isHydrated, login } = useAuth()

  const redirectTarget = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Already signed in — don't show the form, bounce to the intended
  // destination (or an account page, if one existed).
  useEffect(() => {
    if (isHydrated && user) {
      router.replace(redirectTarget)
    }
  }, [isHydrated, user, redirectTarget, router])

  if (!isHydrated || user) return null

  const emailError = !isRequired(email)
    ? 'Email address is required.'
    : !isValidEmail(email)
    ? 'Enter a valid email address.'
    : undefined
  const passwordError = !isRequired(password) ? 'Password is required.' : undefined
  const isFormValid = !emailError && !passwordError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setFormError(null)
    const result = await login(email, password)
    if (result.success) {
      router.replace(redirectTarget)
      return
    }
    setFormError(result.error ?? 'Something went wrong. Please try again.')
    setPassword('')
    setIsSubmitting(false)
  }

  return (
    <div className="max-w-[440px] mx-auto py-10 sm:py-14">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight mb-2">
          Welcome Back
        </h1>
        <p className="text-sm font-sans text-text-secondary">Sign in to your NUCOUTHS account</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          label="Email Address"
          htmlFor="email"
          required
          error={touched.email ? emailError : undefined}
        >
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setFormError(null)
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={!!(touched.email && emailError)}
            aria-describedby={touched.email && emailError ? 'email-error' : undefined}
            className={fieldInputClass(!!(touched.email && emailError))}
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <PasswordField
            id="password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(value) => {
              setPassword(value)
              setFormError(null)
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={touched.password ? passwordError : undefined}
          />

          <div className="flex justify-end -mt-1">
            <Link
              href="/forgot-password"
              className="text-xs font-sans text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        {formError && (
          <p role="alert" aria-live="assertive" className="text-[11px] font-sans text-sale text-center">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      <AuthDivider />

      <GoogleAuthButton redirectTarget={redirectTarget} onErrorChange={setFormError} />

      <p className="text-center text-sm font-sans text-text-secondary mt-8">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-text-primary font-medium underline underline-offset-2 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Create an Account
        </Link>
      </p>

      <SecurityMessage />
    </div>
  )
}
