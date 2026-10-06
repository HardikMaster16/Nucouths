import type { Metadata } from 'next'
import { listAdminOrders } from '@/lib/admin/orders.db'
import { AdminOrdersClient } from '@/components/admin/orders/AdminOrdersClient'

export const metadata: Metadata = { title: 'Orders' }

// Orders are read live from Prisma on every request — without this, Next
// would prerender this page once at build time and keep serving that
// snapshot in production regardless of later orders/status changes.
export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
          Orders
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Manage customer orders, payment status, fulfillment, and delivery.
        </p>
      </div>

      <AdminOrdersClient initialOrders={orders} />
    </div>
  )
}
