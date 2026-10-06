'use client'

import { useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  retry: () => void
}

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  const [isRetrying, startRetry] = useTransition()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error)
    }
  }, [error])

  return (
    <main id="main-content" className="flex items-center justify-center py-24 sm:py-32">
      <Container size="sm">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-3xl sm:text-4xl text-text-primary leading-tight">
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
  )
}
