import type { Metadata } from 'next'
import { listInventoryRows } from '@/lib/admin/inventory.db'
import { listAdminCategories } from '@/lib/admin/products.db'
import { AdminInventoryClient } from '@/components/admin/inventory/AdminInventoryClient'

export const metadata: Metadata = { title: 'Inventory' }

// Stock is read live from Prisma on every request — without this, Next
// would prerender this page once at build time and keep serving that
// snapshot in production regardless of later stock changes.
export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  const [rows, categoryOptions] = await Promise.all([listInventoryRows(), listAdminCategories()])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
          Inventory
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Track and adjust stock across every product variant.
        </p>
      </div>

      <AdminInventoryClient initialRows={rows} categoryOptions={categoryOptions} />
    </div>
  )
}
