import type { Metadata } from 'next'
import { getAdminSettingsRecord } from '@/lib/admin/settings.db'
import { getPaymentStatusRows } from '@/lib/admin/settings'
import { AdminSettingsClient } from '@/components/admin/settings/AdminSettingsClient'

export const metadata: Metadata = { title: 'Settings' }

// Settings are read live from Prisma on every request — without this, Next
// would prerender this page once at build time and keep serving that
// snapshot in production regardless of later changes.
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const { store: seedStore, storefront: seedStorefront, order: seedOrder } = await getAdminSettingsRecord()
  const paymentRows = getPaymentStatusRows()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
          Settings
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Manage your store&apos;s details, storefront behavior, order numbering, and payment availability.
        </p>
      </div>

      <AdminSettingsClient
        seedStore={seedStore}
        seedStorefront={seedStorefront}
        seedOrder={seedOrder}
        paymentRows={paymentRows}
      />
    </div>
  )
}
