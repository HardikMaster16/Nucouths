import React from 'react'
import Link from 'next/link'

interface ComingSoonPlaceholderProps {
  title: string
  description: string
}

/** Minimal, clearly-labeled stand-in for an admin section not built yet —
 *  keeps every sidebar route real (no dead `#` links) without pretending the
 *  feature exists. */
export function ComingSoonPlaceholder({ title, description }: ComingSoonPlaceholderProps) {
  return (
    <div className="bg-white border border-border rounded-sm p-8 sm:p-12 flex flex-col items-center text-center gap-3">
      <p className="text-2xs font-sans font-semibold tracking-[0.18em] uppercase text-text-secondary">
        Coming Soon
      </p>
      <h2 className="font-display text-2xl text-text-primary leading-tight">{title}</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">{description}</p>
      <Link
        href="/admin"
        className="mt-3 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
