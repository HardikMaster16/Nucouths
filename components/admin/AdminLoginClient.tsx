'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Login (client)
//
// Mirrors components/auth/LoginClient.tsx's structure, against the separate
// admin session (useAdminAuth()) — never the customer auth. login() verifies
// credentials against a real Prisma-backed admin account (see
// lib/admin/auth/admin-session.actions.ts) and never fabricates success.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAdminAuth } from '@/lib/admin/admin-auth-context'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { PasswordField } from '@/components/auth/PasswordField'
import { isValidEmail, isRequired } from '@/lib/checkout-validation'
import { Button } from '@/components/ui/Button'

export function AdminLoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { admin, isHydrated, login } = useAdminAuth()

  const redirectTarget = searchParams.get('redirect') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Already signed in as admin — don't show the form, bounce straight in.
  useEffect(() => {
    if (isHydrated && admin) {
      router.replace(redirectTarget)
    }
  }, [isHydrated, admin, redirectTarget, router])

  if (!isHydrated || admin) return null

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
    <div className="w-full max-w-[400px]">
      <div className="text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/text-logo.svg" alt="Nucouths" className="h-4 w-auto mx-auto mb-3" />
        <h1 className="text-xl font-sans font-semibold text-text-primary leading-tight">
          Admin Sign In
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Authorized store administrators only.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          label="Email Address"
          htmlFor="admin-email"
          required
          error={touched.email ? emailError : undefined}
        >
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="Enter your admin email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setFormError(null)
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={!!(touched.email && emailError)}
            aria-describedby={touched.email && emailError ? 'admin-email-error' : undefined}
            className={fieldInputClass(!!(touched.email && emailError))}
          />
        </FormField>

        <PasswordField
          id="admin-password"
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

      <p className="text-center text-[11px] font-sans text-text-secondary mt-8">
        Authorized personnel only. Access is logged.
      </p>
    </div>
  )
}
