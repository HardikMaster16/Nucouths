import type { Metadata } from 'next'
import { listAdminBanners } from '@/lib/banners.db'
import { AdminBannersClient } from '@/components/admin/banners/AdminBannersClient'

export const metadata: Metadata = { title: 'Banners' }

// Banners are read live from Prisma on every request — without this, Next
// would prerender this page once at build time and keep serving that
// snapshot in production regardless of later banner changes.
export const dynamic = 'force-dynamic'

export default async function AdminBannersPage() {
  const banners = await listAdminBanners()

  return <AdminBannersClient initialBanners={banners} />
}
