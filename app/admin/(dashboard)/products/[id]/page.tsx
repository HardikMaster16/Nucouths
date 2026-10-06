import type { Metadata } from 'next'
import { getAdminProductWithDetail } from '@/lib/admin/products.db'
import { LocalProductViewClient } from '@/components/admin/products/LocalProductViewClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const found = await getAdminProductWithDetail(id)
  return { title: found ? found.row.name : 'Product' }
}

export default async function AdminProductViewPage({ params }: PageProps) {
  const { id } = await params
  const found = await getAdminProductWithDetail(id)

  return <LocalProductViewClient seedRow={found?.row} seedDetail={found?.detail} />
}
