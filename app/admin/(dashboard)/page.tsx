import type { Metadata } from 'next'
import Link from 'next/link'
import { getDashboardData } from '@/lib/admin/dashboard.db'
import { KpiCard } from '@/components/admin/KpiCard'
import { SalesOverview } from '@/components/admin/SalesOverview'
import { RecentOrdersTable } from '@/components/admin/RecentOrdersTable'
import { LowStockList } from '@/components/admin/LowStockList'
import { SalesIcon, OrdersIcon, ProductsIcon, CustomersIcon, AlertIcon } from '@/components/admin/icons'

export const metadata: Metadata = {
  title: 'Dashboard',
}

// Read live from Prisma on every request — same convention as every other
// admin listing page (e.g. app/admin/(dashboard)/products/page.tsx):
// without this, Next would prerender the dashboard once at build time and
// keep serving that snapshot regardless of later orders/stock changes.
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const { kpis, salesByStatus, recentOrders, lowStock } = await getDashboardData()

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
          Dashboard
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Overview of your NUCOUTHS store.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Sales" value={kpis.totalSalesFormatted} supporting="From live orders" icon={SalesIcon} />
        <KpiCard label="Orders" value={String(kpis.orderCount)} supporting="From live orders" icon={OrdersIcon} />
        <KpiCard label="Products" value={String(kpis.productCount)} supporting="From live catalog" icon={ProductsIcon} />
        <KpiCard label="Customers" value={String(kpis.customerCount)} supporting="From live accounts" icon={CustomersIcon} />
      </div>

      {kpis.lowStockCount > 0 && (
        <div className="bg-white border border-border rounded-sm p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#B45309]/10 text-[#B45309] flex items-center justify-center shrink-0">
            <AlertIcon className="w-4 h-4" />
          </div>
          <p className="text-sm font-sans text-text-primary">
            <span className="font-medium">{kpis.lowStockCount}</span>{' '}
            {kpis.lowStockCount === 1 ? 'product needs' : 'products need'} restocking soon.
          </p>
        </div>
      )}

      {/* Sales overview + Low stock */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <section className="bg-white border border-border rounded-sm p-5 sm:p-6" aria-labelledby="sales-overview-heading">
          <h2 id="sales-overview-heading" className="text-sm font-sans font-semibold text-text-primary mb-1">
            Sales Overview
          </h2>
          <p className="text-xs font-sans text-text-secondary mb-5">
            Order totals grouped by status.
          </p>
          <SalesOverview rows={salesByStatus} />
        </section>

        <section className="bg-white border border-border rounded-sm p-5 sm:p-6" aria-labelledby="low-stock-heading">
          <h2 id="low-stock-heading" className="text-sm font-sans font-semibold text-text-primary mb-1">
            Low Stock Products
          </h2>
          <p className="text-xs font-sans text-text-secondary mb-2">
            Variants at or below the low-stock threshold.
          </p>
          <LowStockList products={lowStock} />
        </section>
      </div>

      {/* Recent orders */}
      <section className="bg-white border border-border rounded-sm p-5 sm:p-6" aria-labelledby="recent-orders-heading">
        <h2 id="recent-orders-heading" className="text-sm font-sans font-semibold text-text-primary mb-1">
          Recent Orders
        </h2>
        <p className="text-xs font-sans text-text-secondary mb-4">
          Most recent orders across the store.
        </p>
        <RecentOrdersTable orders={recentOrders} />
      </section>

      {/* Manage products */}
      <section className="bg-white border border-border rounded-sm p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-sans font-semibold text-text-primary">Product Catalog</h2>
          <p className="text-xs font-sans text-text-secondary mt-0.5">
            {kpis.productCount} products live on the storefront.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          Manage Products →
        </Link>
      </section>
    </div>
  )
}
