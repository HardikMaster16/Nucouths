'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Account Details (client)
//
// Shares the account auth gate + sidebar with the rest of /account/*
// (useAccountAuth, AccountSidebar). The profile shown here is the same
// Prisma-backed `user` useAccountAuth() already resolved from the session
// cookie — no separate fetch, so there's nothing to retry-on-failure.
//
// Editable fields (first/last name, phone) are saved through
// useAuth().updateProfile, a real server action (lib/auth/customer-
// auth.actions.ts's updateCustomerProfileAction) — this component never
// talks to localStorage or the database directly. Email stays read-only:
// changing it would need its own re-verification flow, out of scope here.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { User } from '@/lib/auth/types'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { Button } from '@/components/ui/Button'
import { isRequired, isValidIndianPhone } from '@/lib/checkout-validation'
import { AccountSidebar } from './AccountSidebar'
import { PasswordSecuritySection } from './PasswordSecuritySection'
import { useAccountAuth } from './useAccountAuth'

// ─── Skeleton ───────────────────────────────────────────────────────────────

function AccountDetailsSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 animate-pulse" aria-hidden="true">
      <div className="lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 bg-surface rounded-sm" />
        ))}
      </div>
      <div className="flex-1 min-w-0 max-w-2xl flex flex-col gap-6">
        <div className="h-40 bg-surface rounded-sm" />
        <div className="h-32 bg-surface rounded-sm" />
        <div className="h-24 bg-surface rounded-sm" />
      </div>
    </div>
  )
}

// ─── Profile form ───────────────────────────────────────────────────────────

interface ProfileValues {
  firstName: string
  lastName: string
  phone: string
}

type ProfileTouched = Partial<Record<keyof ProfileValues, boolean>>

function ProfileForm({ profile }: { profile: User }) {
  const { updateProfile } = useAuth()

  const [values, setValues] = useState<ProfileValues>({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
  })
  const [touched, setTouched] = useState<ProfileTouched>({})
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (saveState !== 'success') return
    const t = setTimeout(() => setSaveState('idle'), 4000)
    return () => clearTimeout(t)
  }, [saveState])

  const errors: Partial<Record<keyof ProfileValues, string>> = {}
  if (!isRequired(values.firstName)) errors.firstName = 'First name is required.'
  if (!isRequired(values.lastName)) errors.lastName = 'Last name is required.'
  if (!isRequired(values.phone)) errors.phone = 'Phone number is required.'
  else if (!isValidIndianPhone(values.phone)) errors.phone = 'Enter a valid 10-digit mobile number.'

  const isValid = Object.keys(errors).length === 0

  const set = (field: keyof ProfileValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setSaveState('idle')
  }
  const blur = (field: keyof ProfileValues) => setTouched((prev) => ({ ...prev, [field]: true }))
  const errorFor = (field: keyof ProfileValues) => (touched[field] ? errors[field] : undefined)
  const invalid = (field: keyof ProfileValues) => !!(touched[field] && errors[field])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ firstName: true, lastName: true, phone: true })
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    const result = await updateProfile({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
    })

    if (result.success) {
      setSaveState('success')
    } else {
      setSaveState('error')
      setSaveError(result.error ?? 'Something went wrong. Please try again.')
    }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <section aria-labelledby="personal-info-heading">
        <h2
          id="personal-info-heading"
          className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary mb-5"
        >
          Personal Information
        </h2>
        <div className="border border-border p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <FormField label="First Name" htmlFor="firstName" required error={errorFor('firstName')}>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                autoComplete="given-name"
                value={values.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                onBlur={() => blur('firstName')}
                aria-invalid={invalid('firstName')}
                aria-describedby={invalid('firstName') ? 'firstName-error' : undefined}
                className={fieldInputClass(invalid('firstName'))}
              />
            </FormField>

            <FormField label="Last Name" htmlFor="lastName" required error={errorFor('lastName')}>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                autoComplete="family-name"
                value={values.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                onBlur={() => blur('lastName')}
                aria-invalid={invalid('lastName')}
                aria-describedby={invalid('lastName') ? 'lastName-error' : undefined}
                className={fieldInputClass(invalid('lastName'))}
              />
            </FormField>
          </div>
        </div>
      </section>

      <section aria-labelledby="contact-info-heading">
        <h2
          id="contact-info-heading"
          className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary mb-5"
        >
          Contact Information
        </h2>
        <div className="border border-border p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <FormField label="Email Address" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                readOnly
                aria-readonly="true"
                autoComplete="email"
                value={profile.email}
                aria-describedby="email-readonly-note"
                className="w-full h-11 px-3.5 rounded-sm border border-border bg-surface text-sm font-sans text-text-secondary cursor-not-allowed"
              />
              <p id="email-readonly-note" className="text-[11px] font-sans text-text-secondary">
                Email changes will be available with account authentication.
              </p>
            </FormField>

            <FormField label="Phone Number" htmlFor="phone" required error={errorFor('phone')}>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                onBlur={() => blur('phone')}
                aria-invalid={invalid('phone')}
                aria-describedby={invalid('phone') ? 'phone-error' : undefined}
                className={fieldInputClass(invalid('phone'))}
              />
            </FormField>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 items-start">
        <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} loading={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
        {saveState === 'success' && (
          <p role="status" aria-live="polite" className="text-[11px] font-sans text-text-secondary">
            Your account details have been updated.
          </p>
        )}
        {saveState === 'error' && (
          <p role="alert" aria-live="assertive" className="text-[11px] font-sans text-sale">
            {saveError}
          </p>
        )}
      </div>
    </form>
  )
}

// ─── AccountDetailsClient ───────────────────────────────────────────────────

export function AccountDetailsClient() {
  const { user, isHydrated, isLoggingOut, handleLogout } = useAccountAuth()
  const { changePassword } = useAuth()

  if (!isHydrated) return <AccountDetailsSkeleton />
  if (!user) return null

  return (
    <div>
      <div className="mb-10 sm:mb-12 border-b border-border pb-6">
        <h1 className="font-display text-[1.75rem] sm:text-3xl lg:text-4xl text-text-primary leading-tight mb-1.5">
          Account Details
        </h1>
        <p className="text-sm font-sans text-text-secondary">
          Manage your personal information and account security.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        <AccountSidebar active="details" onLogout={handleLogout} isLoggingOut={isLoggingOut} />

        <div className="flex-1 min-w-0 max-w-2xl">
          <div className="flex flex-col gap-10">
            <ProfileForm profile={user} />
            <PasswordSecuritySection changePassword={changePassword} />
          </div>
        </div>
      </div>
    </div>
  )
}
