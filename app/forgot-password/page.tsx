import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Forgot Password — Nucouths',
  description: 'Reset your Nucouths account password.',
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// Placeholder route — password reset isn't implemented yet.

export default function ForgotPasswordPage() {
  return (
    <main id="main-content" className="py-20 sm:py-28">
      <Container size="sm" className="text-center flex flex-col items-center gap-4">
        <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight">
          Forgot Password
        </h1>
        <p className="text-sm font-sans text-text-secondary max-w-sm">
          Password reset isn&apos;t available yet — check back soon.
        </p>
        <Link
          href="/login"
          className="mt-2 text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Return to Sign In
        </Link>
      </Container>
    </main>
  )
}
