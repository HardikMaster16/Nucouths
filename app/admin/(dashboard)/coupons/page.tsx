import type { Metadata } from 'next'
import { listAdminCoupons } from '@/lib/admin/coupons.db'
import { AdminCouponsClient } from '@/components/admin/coupons/AdminCouponsClient'

export const metadata: Metadata = { title: 'Coupons & Discounts' }

// Coupons are read live from Prisma on every request — without this, Next
// would prerender this page once at build time and keep serving that
// snapshot in production regardless of later coupon changes.
export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  const coupons = await listAdminCoupons()

  return <AdminCouponsClient initialCoupons={coupons} />
}
