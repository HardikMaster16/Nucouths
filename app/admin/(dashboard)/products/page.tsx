import type { Metadata } from 'next'
import Link from 'next/link'
import { listAdminProducts, listAdminCategories } from '@/lib/admin/products.db'
import { AdminProductsClient } from '@/components/admin/products/AdminProductsClient'

export const metadata: Metadata = { title: 'Products' }

// The catalog is read live from Prisma on every request — without this,
// Next would prerender this page once at build time and keep serving that
// snapshot in production regardless of later database changes.
export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const [products, categoryOptions] = await Promise.all([listAdminProducts(), listAdminCategories()])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight">
            Products
          </h1>
          <p className="text-sm font-sans text-text-secondary mt-1">
            Manage the NUCOUTHS catalog — search, filter, and update products.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center h-11 px-6 text-sm font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 shrink-0"
        >
          + Add Product
        </Link>
      </div>

      <AdminProductsClient initialProducts={products} categoryOptions={categoryOptions} />
    </div>
  )
}
