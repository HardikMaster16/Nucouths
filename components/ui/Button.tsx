import React from 'react'
import type { ButtonVariant, ButtonSize } from '@/lib/types'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  as?: 'button' | 'a'
  href?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-text-primary text-white hover:bg-[#2a2a2a] active:bg-[#000] focus-visible:ring-text-primary disabled:opacity-100 disabled:bg-text-secondary disabled:text-white disabled:hover:bg-text-secondary',
  secondary:
    'bg-surface text-text-primary hover:bg-border active:bg-[#d8d8d8] focus-visible:ring-text-primary disabled:opacity-40',
  ghost:
    'bg-transparent text-text-primary hover:bg-surface active:bg-border focus-visible:ring-text-primary disabled:opacity-40',
  outline:
    'bg-transparent text-text-primary border border-text-primary hover:bg-text-primary hover:text-white active:bg-[#2a2a2a] focus-visible:ring-text-primary disabled:opacity-40',
  accent:
    'bg-accent text-white hover:bg-accent-dark active:bg-accent-dark focus-visible:ring-accent disabled:opacity-40',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-4 text-xs tracking-wide',
  md: 'h-11 px-6 text-sm tracking-wide',
  lg: 'h-13 px-8 text-base tracking-wider',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-sans font-medium uppercase',
        'transition-all duration-250',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={loading}
    >
      {loading && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
