// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Dashboard Reads (Prisma)
//
// Server-only reads backing /admin (the top-level Dashboard page). Imported
// only from that Server Component — never from a 'use client' component, so
// Prisma is never pulled into a browser bundle.
//
// Supersedes lib/admin/dashboard.ts, which is left in place but now unused
// (same "kept as an unused fallback rather than deleted" convention already
// applied to lib/admin/orders.ts, inventory.ts, and product-service.ts's
// dead local-store functions) — that file's ADMIN_MOCK_ORDERS/
// ADMIN_MOCK_CUSTOMERS/mock products.length produced entirely fabricated
// numbers, which is why every KPI card was explicitly labeled "Development
// data" (and why "Products: From live catalog" was actually false — it read
// lib/mock-data.ts's 8-item array, never the real catalog).
//
// Revenue rule: an order "counts toward revenue" iff its fulfillment status
// (Order.status) is anything other than Cancelled. This is not a new rule —
// it's the exact same one already established independently in TWO places:
// lib/admin/customers.db.ts's isRevenueOrderStatus (used for a customer's
// totalSpent/averageOrderValue) and lib/admin/orders.db.ts's
// dbOrderToAdminRow (countsAsSale: status !== 'Cancelled'). This dashboard
// follows that existing precedent rather than inventing a payment-status
// rule: Order.paymentStatus (Pending/Paid/Failed — see its own schema
// docstring) is tracked separately and isn't factored into "sales" by
// either of those existing surfaces either, so a Confirmed-but-not-yet-paid
// COD order counts here exactly as it already does on /admin/orders and a
// customer's own order history.
//
// Every query below is a single aggregate/grouped/counted query over the
// whole relevant table — never one query per row — and all run concurrently
// via Promise.all, so this page issues a fixed, small number of queries
// regardless of how many products/orders/customers exist (no N+1).
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/cart-pricing'
import { requireAdminSession } from './auth/admin-session.actions'
import { LOW_STOCK_THRESHOLD } from '@/lib/product-detail-data'
import { FROM_PRISMA_ORDER_STATUS, TO_PRISMA_ORDER_STATUS } from './orders.db'
import type { OrderStatus } from '@/lib/types'

export interface DashboardKpis {
  totalSales: number
  totalSalesFormatted: string
  orderCount: number
  productCount: number
  customerCount: number
  lowStockCount: number
}

export interface SalesByStatus {
  status: OrderStatus
  orderCount: number
  total: number
  totalFormatted: string
}

export interface RecentOrderRow {
  orderNumber: string
  customerName: string
  placedAt: string
  status: OrderStatus
  total: number
  totalFormatted: string
}

export interface LowStockRow {
  productId: string
  productName: string
  slug: string
  color: string
  size: string
  stock: number
}

export interface DashboardData {
  kpis: DashboardKpis
  salesByStatus: SalesByStatus[]
  recentOrders: RecentOrderRow[]
  lowStock: LowStockRow[]
}

const STATUS_DISPLAY_ORDER: OrderStatus[] = [
  'Delivered',
  'Shipped',
  'Out for Delivery',
  'Confirmed',
  'Processing',
  'Cancelled',
]

function customerNameFor(user: { firstName: string; lastName: string } | null): string {
  if (!user) return 'Guest'
  return `${user.firstName} ${user.lastName}`.trim() || 'Guest'
}

/** Everything the Dashboard page needs, fetched in one call. Requires an
 *  admin session — the same requireAdminSession() guard every other
 *  server-side admin mutation in this app already uses — before any query
 *  runs. `limit` bounds both Recent Orders and Low Stock, matching the mock
 *  version's default of 6 for each. */
export async function getDashboardData(limit = 6): Promise<DashboardData> {
  await requireAdminSession()

  const [productCount, customerCount, orderCount, revenueAgg, statusGroups, recentOrdersRaw, lowStockVariants] =
    await Promise.all([
      prisma.product.count(),
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'Cancelled' } },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.order.findMany({
        orderBy: { placedAt: 'desc' },
        take: limit,
        select: {
          orderNumber: true,
          placedAt: true,
          status: true,
          total: true,
          currency: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.productVariant.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD } },
        select: {
          productId: true,
          color: true,
          size: true,
          stock: true,
          product: { select: { name: true, slug: true } },
        },
        orderBy: { stock: 'asc' },
      }),
    ])

  const totalSales = Number(revenueAgg._sum.total ?? 0)

  const statusGroupMap = new Map(statusGroups.map((g) => [g.status, g]))
  const salesByStatus: SalesByStatus[] = STATUS_DISPLAY_ORDER.map((status) => {
    const group = statusGroupMap.get(TO_PRISMA_ORDER_STATUS[status])
    const total = Number(group?._sum.total ?? 0)
    return {
      status,
      orderCount: group?._count._all ?? 0,
      total,
      totalFormatted: formatPrice(total, 'INR'),
    }
  }).filter((row) => row.orderCount > 0)

  const recentOrders: RecentOrderRow[] = recentOrdersRaw.map((o) => {
    const total = Number(o.total)
    return {
      orderNumber: o.orderNumber,
      customerName: customerNameFor(o.user),
      placedAt: o.placedAt.toISOString(),
      status: FROM_PRISMA_ORDER_STATUS[o.status],
      total,
      totalFormatted: formatPrice(total, o.currency),
    }
  })

  // One row per PRODUCT (its single lowest-stock variant), not one row per
  // variant — matches the original semantics exactly (a product with three
  // variants and only one critically low still contributes one row).
  const lowestByProduct = new Map<string, (typeof lowStockVariants)[number]>()
  for (const v of lowStockVariants) {
    const current = lowestByProduct.get(v.productId)
    if (!current || v.stock < current.stock) lowestByProduct.set(v.productId, v)
  }
  const lowStock: LowStockRow[] = [...lowestByProduct.values()]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit)
    .map((v) => ({
      productId: v.productId,
      productName: v.product.name,
      slug: v.product.slug,
      color: v.color,
      size: v.size,
      stock: v.stock,
    }))

  return {
    kpis: {
      totalSales,
      totalSalesFormatted: formatPrice(totalSales, 'INR'),
      orderCount,
      productCount,
      customerCount,
      lowStockCount: lowestByProduct.size,
    },
    salesByStatus,
    recentOrders,
    lowStock,
  }
}
