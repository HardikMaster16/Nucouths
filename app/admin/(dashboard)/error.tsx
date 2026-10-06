'use client'

import { useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/Button'

interface AdminErrorProps {
  error: Error & { digest?: string }
  retry: () => void
}

// Mirrors app/error.tsx's pattern (same Next.js retry() convention) — kept
// separate because this boundary sits inside the admin shell (sidebar/top
// bar still render around it) and must never look like the customer error
// page or expose technical details to whoever's signed in.
export default function AdminDashboardError({ error, retry }: AdminErrorProps) {
  const [isRetrying, startRetry] = useTransition()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error)
    }
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-border rounded-sm">
      <h1 className="text-xl font-sans font-semibold text-text-primary mb-2">
        Unable to load dashboard data.
      </h1>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-6">
        Something went wrong while loading this page. Please try again.
      </p>
      <Button
        type="button"
        variant="primary"
        size="md"
        loading={isRetrying}
        onClick={() => startRetry(() => retry())}
      >
        Try Again
      </Button>
    </div>
  )
}
