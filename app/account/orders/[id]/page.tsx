import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { OrderDetailClient } from '@/components/account/OrderDetailClient'

// ─── Metadata ─────────────────────────────────────────────────────────────────
//
// Kept param-only (no Prisma lookup here) so a nonexistent/foreign order
// number never needs a second ownership check just to render a <title> —
// OrderDetailClient's own getMyOrderAction call is the one place that
// matters, and it already treats "not found" and "not yours" identically.
// `absolute` bypasses the root layout's title template so this renders
// exactly "Order #[ORDER NUMBER] | Nucouths" rather than being wrapped a
// second time.

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: { absolute: `Order #${id} | Nucouths` },
    description: 'View the details of your NUCOUTHS order.',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { id } = await params

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
                href="/account"
                className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded"
              >
                My Account
              </Link>
            </li>
            <li aria-hidden="true" className="text-border select-none">›</li>
            <li>
              <Link
                href="/account/orders"
                className="hover:text-text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary rounded"
              >
                Orders
              </Link>
            </li>
            <li aria-hidden="true" className="text-border select-none">›</li>
            <li aria-current="page" className="text-text-primary font-medium truncate max-w-[200px] sm:max-w-none">
              #{id}
            </li>
          </ol>
        </nav>

        <OrderDetailClient orderId={id} />
      </Container>
    </main>
  )
}
