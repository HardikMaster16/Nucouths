import React from 'react'
import Link from 'next/link'

interface SectionHeadingProps {
  title: string
  subtitle?: string
  viewAllHref?: string
  viewAllLabel?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View All',
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  return (
    <div
      className={[
        'flex items-end justify-between gap-4 mb-8',
        align === 'center' ? 'flex-col items-center text-center' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div>
        <h2 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary font-sans">{subtitle}</p>
        )}
      </div>

      {viewAllHref && align !== 'center' && (
        <Link
          href={viewAllHref}
          className="shrink-0 text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline-offset-4 hover:underline transition-colors duration-200"
        >
          {viewAllLabel}
        </Link>
      )}

      {viewAllHref && align === 'center' && (
        <Link
          href={viewAllHref}
          className="text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline-offset-4 hover:underline transition-colors duration-200"
        >
          {viewAllLabel}
        </Link>
      )}
    </div>
  )
}
