import type { Metadata } from 'next'
import { listAdminCustomers } from '@/lib/admin/customers.db'
import { AdminCustomersClient } from '@/components/admin/customers/AdminCustomersClient'

export const metadata: Metadata = { title: 'Customers' }

// Customers are read live from Prisma on every request — without this, Next
// would prerender this page once at build time and keep serving that
// snapshot in production regardless of later signups/orders.
export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  const customers = await listAdminCustomers()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
          Customers
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Browse customer accounts, order activity, and lifetime spend.
        </p>
      </div>

      <AdminCustomersClient initialCustomers={customers} />
    </div>
  )
}
