import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { OrderSuccessClient } from '@/components/checkout/OrderSuccessClient'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Order Confirmed — Nucouths',
  description: 'Your order has been placed successfully.',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderSuccessPage() {
  return (
    <main id="main-content">
      <Container>
        <OrderSuccessClient />
      </Container>
    </main>
  )
}
