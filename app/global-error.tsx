'use client'

import { useEffect, useTransition } from 'react'
import localFont from 'next/font/local'
import Link from 'next/link'
import './globals.css'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

// ─────────────────────────────────────────────────────────────────────────────
// Root-level fallback for errors thrown above app/error.tsx's boundary — i.e.
// inside app/layout.tsx itself (AnnouncementBar, Header, Footer, or the Cart/
// Wishlist/Auth/Address providers). global-error replaces the entire root
// layout, so it cannot rely on anything layout.tsx provides and must define
// its own <html>/<body>, fonts and global styles. Button/Container are safe to
// reuse here — neither imports app providers or app/layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

// Mirrors app/layout.tsx's font setup exactly — this file can't import
// from layout.tsx (see the module docstring above), so the two local-font
// calls are duplicated rather than shared.
const sequelSansBody = localFont({
  src: [
    { path: '../fonts/sequel-sans/sequel-sans-body-regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-body-medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-body-semibold.ttf', weight: '600', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-body-bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sequel-body',
  display: 'swap',
})

const sequelSansDisplay = localFont({
  src: [
    { path: '../fonts/sequel-sans/sequel-sans-display-regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-display-medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-display-semibold.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-sequel-display',
  display: 'swap',
})

interface GlobalErrorProps {
  error: Error & { digest?: string }
  retry: () => void
}

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  const [isRetrying, startRetry] = useTransition()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error)
    }
  }, [error])

  return (
    <html lang="en" className={`${sequelSansBody.variable} ${sequelSansDisplay.variable}`}>
      <body className="min-h-screen flex flex-col bg-background font-sans antialiased">
        <title>Something Went Wrong | Nucouths</title>

        <main
          id="main-content"
          className="flex-1 flex items-center justify-center py-24 sm:py-32"
        >
          <Container size="sm">
            <div className="flex flex-col items-center text-center">
              <Link
                href="/"
                aria-label="Nucouths — return to homepage"
                className="font-display text-lg tracking-[0.22em] uppercase text-text-primary hover:text-accent transition-colors duration-250"
              >
                Nucouths
              </Link>

              <h1 className="mt-10 font-display text-3xl sm:text-4xl text-text-primary leading-tight">
                Something Went Wrong
              </h1>

              <p className="mt-4 max-w-sm text-sm font-sans text-text-secondary">
                We couldn&apos;t load this page right now. Please try again.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  loading={isRetrying}
                  onClick={() => startRetry(() => retry())}
                >
                  Try Again
                </Button>

                <Link
                  href="/"
                  className="text-xs font-sans font-medium uppercase tracking-wider text-text-secondary hover:text-text-primary underline underline-offset-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </Container>
        </main>
      </body>
    </html>
  )
}
