import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Container } from '@/components/ui/Container'
import { LoginClient } from '@/components/auth/LoginClient'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Sign In — Nucouths',
  description: 'Sign in to your Nucouths account.',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <main id="main-content" className="pb-16 lg:pb-20">
      <Container className="pt-5 sm:pt-7">
        {/* ── Breadcrumb ──────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-sans text-text-secondary">
            <li>
              <Link
                href="/"
                className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-border select-none">›</li>
            <li aria-current="page" className="text-text-primary font-medium">
              Login
            </li>
          </ol>
        </nav>

        {/* useSearchParams (for post-login redirect) requires a Suspense boundary */}
        <Suspense fallback={null}>
          <LoginClient />
        </Suspense>
      </Container>
    </main>
  )
}
