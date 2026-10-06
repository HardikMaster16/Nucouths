import type { Metadata } from 'next'
import { getAdminCustomerDetail } from '@/lib/admin/customers.db'
import { AdminCustomerDetailView } from '@/components/admin/customers/AdminCustomerDetailView'
import { CustomerNotFound } from '@/components/admin/customers/CustomerNotFound'

interface PageProps {
  params: Promise<{ id: string }>
}

// Read live from Prisma on every request.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const customer = await getAdminCustomerDetail(id)
  return { title: customer ? customer.name : 'Customer' }
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params
  const customer = await getAdminCustomerDetail(id)

  if (!customer) return <CustomerNotFound />

  return <AdminCustomerDetailView customer={customer} />
}
