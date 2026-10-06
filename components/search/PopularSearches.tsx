// Plain links — no client-side state needed, so this stays a server
// component. Terms are passed in from app/search/page.tsx, derived from the
// real product data/facets (see getFilteredProducts), never hardcoded here.

import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'

export function PopularSearches({ terms }: { terms: string[] }) {
  if (terms.length === 0) return null

  return (
    <Container className="py-10 sm:py-14">
      <p className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase text-text-secondary mb-4">
        Popular Searches
      </p>
      <div className="flex flex-wrap gap-2.5">
        {terms.map((term) => (
          <Link
            key={term}
            href={`/search?q=${encodeURIComponent(term)}`}
            className="inline-flex items-center h-9 px-4 border border-border text-xs font-sans font-medium tracking-wide uppercase text-text-primary hover:border-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded-sm"
          >
            {term}
          </Link>
        ))}
      </div>
    </Container>
  )
}
