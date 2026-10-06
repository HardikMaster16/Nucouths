import type { Metadata } from 'next'
import { listAdminCategories, listAdminCollections, listAdminProductTypes } from '@/lib/admin/products.db'
import { AddProductClient } from '@/components/admin/products/AddProductClient'

export const metadata: Metadata = { title: 'Add Product' }

// Category/collection/type options are read live from Prisma on every
// request — otherwise Next would prerender this page once at build time and
// keep offering stale dropdown options in production.
export const dynamic = 'force-dynamic'

export default async function AdminNewProductPage() {
  const [categoryOptions, productTypeOptions, collectionOptions] = await Promise.all([
    listAdminCategories(),
    listAdminProductTypes(),
    listAdminCollections(),
  ])

  return (
    <AddProductClient
      categoryOptions={categoryOptions}
      collectionOptions={collectionOptions}
      productTypeOptions={productTypeOptions}
    />
  )
}
