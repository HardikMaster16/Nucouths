'use client'

import React from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}

/** Shared label + input slot + inline error, used by every checkout field so
 *  every section renders identical label/spacing/error styling. */
export function FormField({ label, htmlFor, required, error, children, className = '' }: FormFieldProps) {
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-sans font-semibold tracking-[0.1em] uppercase text-text-primary"
      >
        {label}
        {required && (
          <span className="text-sale ml-1 normal-case tracking-normal" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-[11px] font-sans text-sale">
          {error}
        </p>
      )}
    </div>
  )
}

/** Shared visual treatment for text/email/tel/select inputs across checkout. */
export function fieldInputClass(hasError?: boolean): string {
  return [
    'w-full h-11 px-3.5 rounded-sm border bg-white text-sm font-sans text-text-primary',
    'placeholder:text-text-secondary/50 transition-colors duration-150',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus:border-text-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasError ? 'border-sale' : 'border-border',
  ].join(' ')
}
