'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Register Page (client)
//
// Mirrors components/auth/LoginClient.tsx exactly in structure and reused
// pieces (FormField/fieldInputClass, PasswordField, GoogleAuthButton,
// AuthDivider, SecurityMessage, the shared validators) so /login and /register
// read as one authentication experience. register() never fabricates success
// — see lib/auth-context.tsx.
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
import { isValidEmail, isRequired, isValidIndianPhone } from '@/lib/checkout-validation'
import { Button } from '@/components/ui/Button'

interface TouchedMap {
  firstName?: boolean
  lastName?: boolean
  email?: boolean
  phone?: boolean
  password?: boolean
  confirmPassword?: boolean
  terms?: boolean
}

export function RegisterClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isHydrated, register } = useAuth()

  const redirectTarget = searchParams.get('redirect') || '/'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [touched, setTouched] = useState<TouchedMap>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Already signed in — don't show registration, bounce to the intended
  // destination (or an account page, if one existed) — same convention as
  // /login.
  useEffect(() => {
    if (isHydrated && user) {
      router.replace(redirectTarget)
    }
  }, [isHydrated, user, redirectTarget, router])

  if (!isHydrated || user) return null

  const firstNameError = !isRequired(firstName) ? 'First name is required.' : undefined
  const lastNameError = !isRequired(lastName) ? 'Last name is required.' : undefined
  const emailError = !isRequired(email)
    ? 'Email address is required.'
    : !isValidEmail(email)
    ? 'Please enter a valid email address.'
    : undefined
  const phoneError =
    phone.trim() && !isValidIndianPhone(phone) ? 'Please enter a valid phone number.' : undefined
  const passwordError = !isRequired(password)
    ? 'Password is required.'
    : password.length < 8
    ? 'Password must contain at least 8 characters.'
    : undefined
  const confirmPasswordError = !isRequired(confirmPassword)
    ? 'Please confirm your password.'
    : confirmPassword !== password
    ? 'Passwords do not match.'
    : undefined
  const termsError = !termsAccepted ? 'Please accept the Terms & Conditions.' : undefined

  const isFormValid =
    !firstNameError &&
    !lastNameError &&
    !emailError &&
    !phoneError &&
    !passwordError &&
    !confirmPasswordError &&
    !termsError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      terms: true,
    })
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setFormError(null)
    const result = await register({
      firstName,
      lastName,
      email,
      phone: phone.trim() || undefined,
      password,
    })
    if (result.success) {
      router.replace(redirectTarget)
      return
    }
    setFormError(result.error ?? 'Something went wrong. Please try again.')
    setPassword('')
    setConfirmPassword('')
    setIsSubmitting(false)
  }

  return (
    <div className="max-w-[440px] mx-auto py-10 sm:py-14">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight mb-2">
          Create an Account
        </h1>
        <p className="text-sm font-sans text-text-secondary">
          Join NUCOUTHS for a more personal shopping experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <FormField
            label="First Name"
            htmlFor="firstName"
            required
            error={touched.firstName ? firstNameError : undefined}
          >
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                setFormError(null)
              }}
              onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
              aria-invalid={!!(touched.firstName && firstNameError)}
              aria-describedby={touched.firstName && firstNameError ? 'firstName-error' : undefined}
              className={fieldInputClass(!!(touched.firstName && firstNameError))}
            />
          </FormField>

          <FormField
            label="Last Name"
            htmlFor="lastName"
            required
            error={touched.lastName ? lastNameError : undefined}
          >
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                setFormError(null)
              }}
              onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
              aria-invalid={!!(touched.lastName && lastNameError)}
              aria-describedby={touched.lastName && lastNameError ? 'lastName-error' : undefined}
              className={fieldInputClass(!!(touched.lastName && lastNameError))}
            />
          </FormField>
        </div>

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

        <FormField label="Phone Number" htmlFor="phone" error={touched.phone ? phoneError : undefined}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              setFormError(null)
            }}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            aria-invalid={!!(touched.phone && phoneError)}
            aria-describedby={touched.phone && phoneError ? 'phone-error' : undefined}
            className={fieldInputClass(!!(touched.phone && phoneError))}
          />
        </FormField>

        <PasswordField
          id="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="new-password"
          value={password}
          onChange={(value) => {
            setPassword(value)
            setFormError(null)
          }}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={touched.password ? passwordError : undefined}
          helperText="Use at least 8 characters."
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value)
            setFormError(null)
          }}
          onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
          error={touched.confirmPassword ? confirmPasswordError : undefined}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2.5">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked)
                setTouched((t) => ({ ...t, terms: true }))
              }}
              aria-invalid={!!(touched.terms && termsError)}
              aria-describedby={touched.terms && termsError ? 'terms-error' : undefined}
              className="mt-0.5 w-4 h-4 shrink-0 rounded-sm border border-border accent-text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1"
            />
            <label htmlFor="terms" className="text-xs font-sans text-text-secondary leading-relaxed cursor-pointer">
              I agree to the{' '}
              <Link href="/terms" className="text-text-primary underline underline-offset-2 hover:no-underline">
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-text-primary underline underline-offset-2 hover:no-underline">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          {touched.terms && termsError && (
            <p id="terms-error" role="alert" className="text-[11px] font-sans text-sale">
              {termsError}
            </p>
          )}
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
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <AuthDivider />

      <GoogleAuthButton redirectTarget={redirectTarget} onErrorChange={setFormError} />

      <p className="text-center text-sm font-sans text-text-secondary mt-8">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-text-primary font-medium underline underline-offset-2 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Sign In
        </Link>
      </p>

      <SecurityMessage />
    </div>
  )
}
