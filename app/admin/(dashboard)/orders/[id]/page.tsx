import type { Metadata } from 'next'
import { getAdminOrderDetail } from '@/lib/admin/orders.db'
import { AdminOrderDetailView } from '@/components/admin/orders/AdminOrderDetailView'
import { OrderNotFound } from '@/components/admin/orders/OrderNotFound'

interface PageProps {
  params: Promise<{ id: string }>
}

// Read live from Prisma on every request — a status change made through the
// editor below must be reflected on the very next load.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const order = await getAdminOrderDetail(id)
  return { title: order ? `Order #${order.orderNumber}` : 'Order' }
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const order = await getAdminOrderDetail(id)

  if (!order) return <OrderNotFound />

  return <AdminOrderDetailView order={order} />
}
