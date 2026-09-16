'use client'

// Shared password input (with an independent show/hide toggle) used by both
// /login and /register, so there's exactly one implementation to keep
// accessible and visually consistent.

import React, { useState } from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a20.29 20.29 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
  helperText?: string
}

export function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  autoComplete,
  error,
  helperText,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`
  const helperId = `${id}-helper`

  return (
    <FormField label={label} htmlFor={id} required error={error}>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={[fieldInputClass(!!error), 'pr-11'].join(' ')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded-sm"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {helperText && !error && (
        <p id={helperId} className="text-[11px] font-sans text-text-secondary">
          {helperText}
        </p>
      )}
    </FormField>
  )
}
