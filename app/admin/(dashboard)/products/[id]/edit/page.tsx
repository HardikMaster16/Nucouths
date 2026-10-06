import type { Metadata } from 'next'
import { getAdminProductWithDetail, listAdminCategories, listAdminCollections, listAdminProductTypes } from '@/lib/admin/products.db'
import { EditProductClient } from '@/components/admin/products/EditProductClient'

export const metadata: Metadata = { title: 'Edit Product' }

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [found, categoryOptions, productTypeOptions, collectionOptions] = await Promise.all([
    getAdminProductWithDetail(id),
    listAdminCategories(),
    listAdminProductTypes(),
    listAdminCollections(),
  ])

  return (
    <EditProductClient
      id={id}
      seedDetail={found?.detail}
      categoryOptions={categoryOptions}
      collectionOptions={collectionOptions}
      productTypeOptions={productTypeOptions}
    />
  )
}
