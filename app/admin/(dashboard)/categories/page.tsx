import type { Metadata } from 'next'
import { listAdminCategoryRows, listAdminCollectionRows } from '@/lib/admin/taxonomy.db'
import { AdminCategoriesClient } from '@/components/admin/categories/AdminCategoriesClient'

export const metadata: Metadata = { title: 'Categories & Collections' }

// Read live from Prisma on every request — without this, Next would
// prerender this page once at build time and keep serving that snapshot in
// production regardless of later database changes.
export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const [categories, collections] = await Promise.all([listAdminCategoryRows(), listAdminCollectionRows()])

  return <AdminCategoriesClient seedCategories={categories} seedCollections={collections} />
}
