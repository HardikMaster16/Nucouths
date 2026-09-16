import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Terms & Conditions — Nucouths',
  description: 'Nucouths Terms & Conditions.',
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// Placeholder route — already linked from the footer and the registration
// form; full policy content isn't written yet.

export default function TermsPage() {
  return (
    <main id="main-content" className="py-20 sm:py-28">
      <Container size="sm" className="text-center flex flex-col items-center gap-4">
        <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm font-sans text-text-secondary max-w-sm">
          Our full Terms &amp; Conditions aren&apos;t published yet — check back soon.
        </p>
        <Link
          href="/"
          className="mt-2 text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Return to Home
        </Link>
      </Container>
    </main>
  )
}
