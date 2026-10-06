import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <main id="main-content" className="flex items-center justify-center py-24 sm:py-32">
      <Container size="sm">
        <div className="flex flex-col items-center text-center">
          <p className="font-display text-6xl sm:text-7xl text-text-primary leading-none">
            404
          </p>

          <h1 className="mt-6 font-sans text-xs sm:text-sm font-medium uppercase tracking-widest text-text-primary">
            Page Not Found
          </h1>

          <p className="mt-4 max-w-sm text-sm font-sans text-text-secondary">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Button as="a" href="/" variant="primary" size="lg">
              Back to Home
            </Button>

            <Link
              href="/products"
              className="text-xs font-sans font-medium uppercase tracking-wider text-text-secondary hover:text-text-primary underline underline-offset-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </Container>
    </main>
  )
}
