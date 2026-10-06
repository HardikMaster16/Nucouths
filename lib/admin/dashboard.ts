// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Dashboard Service
//
// The one place the Dashboard UI reads business data from. Combines real
// catalog data (lib/mock-data.ts, lib/product-detail-data.ts) with the
// admin's store-wide mock order/customer set (lib/admin/mock-data.ts) — never
// invented numbers inline in a component. Swap this file's internals for
// real API/database calls later; its exported function signatures are the
// contract the UI depends on, so nothing above this layer needs to change:
//
//   Dashboard UI → this service → (today) mock data → (later) API → database
// ─────────────────────────────────────────────────────────────────────────────

import { products } from '@/lib/mock-data'
import { getAllProductSlugs, getProductDetail, variantStockState } from '@/lib/product-detail-data'
import { formatPrice } from '@/lib/cart-pricing'
import { ADMIN_MOCK_CUSTOMERS, ADMIN_MOCK_ORDERS } from './mock-data'
import type { PlacedOrder } from '@/lib/order-storage'
import type { OrderStatus } from '@/lib/types'

// ─── KPI summary ─────────────────────────────────────────────────────────────

export interface DashboardKpis {
  totalSales: number
  totalSalesFormatted: string
  orderCount: number
  productCount: number
  customerCount: number
  lowStockCount: number
}

/** Orders that count toward revenue — a cancelled order was never fulfilled,
 *  so it's excluded from "Total Sales" the same way a real revenue report would. */
function isRevenueOrder(order: PlacedOrder): boolean {
  return order.status !== 'Cancelled'
}

export function getDashboardKpis(): DashboardKpis {
  const revenueOrders = ADMIN_MOCK_ORDERS.filter(isRevenueOrder)
  const totalSales = revenueOrders.reduce((sum, o) => sum + o.totals.total, 0)
  const lowStock = getLowStockProducts()

  return {
    totalSales,
    totalSalesFormatted: formatPrice(totalSales, 'INR'),
    orderCount: ADMIN_MOCK_ORDERS.length,
    productCount: products.length,
    customerCount: ADMIN_MOCK_CUSTOMERS.length,
    lowStockCount: lowStock.length,
  }
}

// ─── Sales overview ──────────────────────────────────────────────────────────
// A small, honest breakdown rather than a fabricated time series — the mock
// order set has too few data points to make a daily/monthly trend meaningful
// without implying more history than exists. Grouping the *real* mock orders
// by status directly complements the Recent Orders list below.

export interface SalesByStatus {
  status: OrderStatus
  orderCount: number
  total: number
  totalFormatted: string
}

const STATUS_DISPLAY_ORDER: OrderStatus[] = [
  'Delivered',
  'Shipped',
  'Out for Delivery',
  'Confirmed',
  'Processing',
  'Cancelled',
]

export function getSalesByStatus(): SalesByStatus[] {
  return STATUS_DISPLAY_ORDER.map((status) => {
    const matching = ADMIN_MOCK_ORDERS.filter((o) => o.status === status)
    const total = matching.reduce((sum, o) => sum + o.totals.total, 0)
    return {
      status,
      orderCount: matching.length,
      total,
      totalFormatted: formatPrice(total, 'INR'),
    }
  }).filter((row) => row.orderCount > 0)
}

// ─── Recent orders ───────────────────────────────────────────────────────────

export interface RecentOrderRow {
  orderNumber: string
  customerName: string
  placedAt: string
  status: OrderStatus
  total: number
  totalFormatted: string
}

function customerNameFor(userId: string | null): string {
  return ADMIN_MOCK_CUSTOMERS.find((c) => c.id === userId)?.name ?? 'Guest'
}

export function getRecentOrders(limit = 6): RecentOrderRow[] {
  return [...ADMIN_MOCK_ORDERS]
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .slice(0, limit)
    .map((o) => ({
      orderNumber: o.orderNumber,
      customerName: customerNameFor(o.userId),
      placedAt: o.placedAt,
      status: o.status,
      total: o.totals.total,
      totalFormatted: formatPrice(o.totals.total, o.currency),
    }))
}

// ─── Low stock products ──────────────────────────────────────────────────────
// Stock lives per-variant (lib/product-detail-data.ts), never on the product
// root — a product is "low stock" here if its single lowest-stock variant is
// at or below the same threshold components/product/ProductClient.tsx's
// variantStockState() already uses, so the dashboard and the PDP never
// disagree about what "low stock" means.

export interface LowStockRow {
  productId: string
  productName: string
  slug: string
  color: string
  size: string
  stock: number
}

export function getLowStockProducts(limit = 6): LowStockRow[] {
  const rows: LowStockRow[] = []

  for (const slug of getAllProductSlugs()) {
    const detail = getProductDetail(slug)
    if (!detail) continue

    let lowest = detail.variants[0]
    for (const variant of detail.variants) {
      if (variant.stock < lowest.stock) lowest = variant
    }

    const state = variantStockState(lowest.stock)
    if (state === 'low-stock' || state === 'sold-out') {
      rows.push({
        productId: detail.id,
        productName: detail.name,
        slug: detail.slug,
        color: lowest.color,
        size: lowest.size,
        stock: lowest.stock,
      })
    }
  }

  return rows.sort((a, b) => a.stock - b.stock).slice(0, limit)
}
