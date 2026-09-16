import React from 'react'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'outline' | 'filled'
  active?: boolean
}

const sizeClasses = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
}

const variantClasses = {
  ghost: 'bg-transparent hover:bg-surface text-text-primary',
  outline: 'bg-transparent border border-border hover:border-text-primary text-text-primary',
  filled: 'bg-surface hover:bg-border text-text-primary',
}

export function IconButton({
  'aria-label': ariaLabel,
  size = 'md',
  variant = 'ghost',
  active = false,
  children,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={[
        'relative inline-flex items-center justify-center',
        'rounded-sm transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        active ? 'text-accent' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
