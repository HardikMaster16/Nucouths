import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { CheckoutClient } from '@/components/checkout/CheckoutClient'
import { getCheckoutData } from '@/lib/checkout.db'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Checkout — Nucouths',
  description: 'Complete your order — contact, shipping, and payment details.',
}

// Reads the live customer session, cart, and address book on every
// request — checkout must always reflect the real, current signed-in
// customer, never a cached/prerendered snapshot.
export const dynamic = 'force-dynamic'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CheckoutPage() {
  // Checkout requires a signed-in customer — getCheckoutData() derives the
  // customer solely from requireCustomerSession() and throws if there's no
  // valid session; that's the only signal this page trusts to decide who's
  // checking out, never a query param or client-supplied id.
  let checkout
  try {
    checkout = await getCheckoutData()
  } catch {
    redirect('/login?redirect=/checkout')
  }

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
            <li>
              <Link
                href="/cart"
                className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded"
              >
                Cart
              </Link>
            </li>
            <li aria-hidden="true" className="text-border select-none">›</li>
            <li aria-current="page" className="text-text-primary font-medium">
              Checkout
            </li>
          </ol>
        </nav>

        <CheckoutClient checkout={checkout} />
      </Container>
    </main>
  )
}
