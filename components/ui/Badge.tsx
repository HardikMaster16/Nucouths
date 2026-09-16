import React from 'react'
import type { BadgeVariant } from '@/lib/types'

interface BadgeProps {
  variant: BadgeVariant
  className?: string
}

const badgeConfig: Record<BadgeVariant, { label: string; classes: string }> = {
  new: {
    label: 'NEW',
    classes: 'bg-text-primary text-white',
  },
  sale: {
    label: 'SALE',
    classes: 'bg-sale text-white',
  },
  'sold-out': {
    label: 'SOLD OUT',
    classes: 'bg-text-secondary text-white',
  },
  limited: {
    label: 'LIMITED',
    classes: 'bg-accent text-white',
  },
}

const badgeMap: Record<string, BadgeVariant> = {
  NEW: 'new',
  SALE: 'sale',
  'SOLD OUT': 'sold-out',
  LIMITED: 'limited',
}

export function Badge({ variant, className = '' }: BadgeProps) {
  const config = badgeConfig[variant]
  if (!config) return null

  return (
    <span
      className={[
        'inline-block px-2 py-0.5',
        'text-2xs font-sans font-semibold tracking-wider uppercase',
        config.classes,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {config.label}
    </span>
  )
}

/**
 * Helper to convert a Product badge string to BadgeVariant
 */
export function productBadgeToVariant(badge: string | undefined): BadgeVariant | undefined {
  if (!badge) return undefined
  return badgeMap[badge]
}
