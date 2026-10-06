'use client'

import { useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/Button'

interface AdminBannersErrorProps {
  error: Error & { digest?: string }
  retry: () => void
}

// Mirrors app/admin/(dashboard)/products/error.tsx's pattern, scoped to this
// route segment so a banners-data failure doesn't take down the rest of the
// admin shell (sidebar/top bar still render around it).
export default function AdminBannersError({ error, retry }: AdminBannersErrorProps) {
  const [isRetrying, startRetry] = useTransition()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error)
    }
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-border rounded-sm">
      <h1 className="text-xl font-sans font-semibold text-text-primary mb-2">
        Unable to load banners.
      </h1>
      <p className="text-sm font-sans text-text-secondary max-w-sm mb-6">
        Something went wrong while loading banner data. Please try again.
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
