'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Password & Security
//
// Calls useAuth().changePassword, a real server action (lib/auth/customer-
// auth.actions.ts's changeCustomerPasswordAction) that verifies the current
// password and persists the new one via bcrypt — this component never sees
// or stores a plaintext password itself. Reuses PasswordField (the same
// show/hide input /login and /register use) for all three fields.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/Button'
import { isRequired } from '@/lib/checkout-validation'
import type { AuthResult } from '@/lib/auth-context'

interface PasswordValues {
  current: string
  next: string
  confirm: string
}

const EMPTY_VALUES: PasswordValues = { current: '', next: '', confirm: '' }

interface PasswordSecuritySectionProps {
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>
}

export function PasswordSecuritySection({ changePassword }: PasswordSecuritySectionProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [values, setValues] = useState<PasswordValues>(EMPTY_VALUES)
  const [touched, setTouched] = useState<Partial<Record<keyof PasswordValues, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(false), 4000)
    return () => clearTimeout(t)
  }, [success])

  const errors: Partial<Record<keyof PasswordValues, string>> = {}
  if (!isRequired(values.current)) errors.current = 'Current password is required.'
  if (!isRequired(values.next)) {
    errors.next = 'New password is required.'
  } else if (values.next.length < 8) {
    errors.next = 'Password must contain at least 8 characters.'
  } else if (values.current && values.next === values.current) {
    errors.next = 'New password must be different from your current password.'
  }
  if (!isRequired(values.confirm)) errors.confirm = 'Please confirm your new password.'
  else if (values.confirm !== values.next) errors.confirm = 'Passwords do not match.'

  const isValid = Object.keys(errors).length === 0

  const set = (field: keyof PasswordValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setFormError(null)
  }
  const blur = (field: keyof PasswordValues) => setTouched((prev) => ({ ...prev, [field]: true }))
  const errorFor = (field: keyof PasswordValues) => (touched[field] ? errors[field] : undefined)

  const reset = () => {
    setValues(EMPTY_VALUES)
    setTouched({})
    setFormError(null)
  }

  const handleCancel = () => {
    reset()
    setMode('view')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ current: true, next: true, confirm: true })
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    const result = await changePassword(values.current, values.next)
    setIsSubmitting(false)

    if (result.success) {
      reset()
      setMode('view')
      setSuccess(true)
    } else {
      setFormError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <section aria-labelledby="password-security-heading">
      <h2
        id="password-security-heading"
        className="text-xs font-sans font-semibold tracking-[0.12em] uppercase text-text-primary mb-5"
      >
        Password &amp; Security
      </h2>

      <div className="border border-border p-6 sm:p-8 flex flex-col gap-5">
        {mode === 'view' ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-2xs font-sans font-semibold tracking-[0.1em] uppercase text-text-secondary mb-1">
                Password
              </p>
              <p className="text-sm font-sans text-text-primary tracking-widest">••••••••</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMode('edit')}>
              Change Password
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <PasswordField
              id="currentPassword"
              label="Current Password"
              placeholder="Enter your current password"
              autoComplete="current-password"
              value={values.current}
              onChange={(v) => set('current', v)}
              onBlur={() => blur('current')}
              error={errorFor('current')}
            />
            <PasswordField
              id="newPassword"
              label="New Password"
              placeholder="Enter a new password"
              autoComplete="new-password"
              value={values.next}
              onChange={(v) => set('next', v)}
              onBlur={() => blur('next')}
              error={errorFor('next')}
              helperText="Use at least 8 characters."
            />
            <PasswordField
              id="confirmNewPassword"
              label="Confirm New Password"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              value={values.confirm}
              onChange={(v) => set('confirm', v)}
              onBlur={() => blur('confirm')}
              error={errorFor('confirm')}
            />

            {formError && (
              <p role="alert" aria-live="assertive" className="text-[11px] font-sans text-sale">
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1 border-t border-border">
              <Button type="button" variant="outline" size="lg" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} loading={isSubmitting}>
                Update Password
              </Button>
            </div>
          </form>
        )}

        {success && (
          <p role="status" aria-live="polite" className="text-[11px] font-sans text-text-secondary">
            Your password has been updated.
          </p>
        )}
      </div>
    </section>
  )
}
