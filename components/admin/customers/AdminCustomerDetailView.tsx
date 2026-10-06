import React from 'react'
import Link from 'next/link'
import { ProductStatusBadge } from '@/components/admin/products/ProductStatusBadge'
import { CustomerOrdersTable } from './CustomerOrdersTable'
import type { AdminCustomerDetail } from '@/lib/admin/customers'

const backLinkClasses =
  'text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded'

const secondaryButtonClasses =
  'inline-flex items-center h-11 px-5 text-sm font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary'

interface AdminCustomerDetailViewProps {
  customer: AdminCustomerDetail
}

export function AdminCustomerDetailView({ customer }: AdminCustomerDetailViewProps) {
  const addr = customer.shippingAddress
  const hasRevenueOrders = customer.orders.some((o) => o.countsAsSale)

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs font-sans text-text-secondary flex-wrap">
          <li>
            <Link href="/admin" className="hover:text-text-primary transition-colors duration-150">
              Admin
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">›</li>
          <li>
            <Link href="/admin/customers" className="hover:text-text-primary transition-colors duration-150">
              Customers
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">›</li>
          <li aria-current="page" className="text-text-primary font-medium truncate max-w-[220px]">
            {customer.name}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/customers" className={backLinkClasses}>
            ← Back to Customers
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mt-2">
            {customer.name}
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <ProductStatusBadge status={customer.status} />
            <span className="text-xs font-sans text-text-secondary">Joined {customer.joinedAtFormatted}</span>
          </div>
        </div>

        <Link href="/admin/customers" className={secondaryButtonClasses}>
          Back to Customers
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">
          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Customer Summary</h2>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Total Orders</p>
                <p className="text-2xl font-sans font-semibold text-text-primary leading-none">{customer.orderCount}</p>
              </div>
              <div>
                <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Total Spent</p>
                <p className="text-2xl font-sans font-semibold text-text-primary leading-none">{customer.totalSpentFormatted}</p>
              </div>
              <div>
                <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Avg. Order Value</p>
                <p className="text-2xl font-sans font-semibold text-text-primary leading-none">
                  {hasRevenueOrders ? customer.averageOrderValueFormatted : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Last Order</p>
                <p className="text-2xl font-sans font-semibold text-text-primary leading-none">
                  {customer.lastOrderAtFormatted ?? '—'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-sans font-semibold text-text-primary">Order History</h2>
              <span className="text-xs font-sans text-text-secondary">
                {customer.orders.length} order{customer.orders.length === 1 ? '' : 's'}
              </span>
            </div>
            <CustomerOrdersTable orders={customer.orders} />
          </section>
        </div>

        {/* ── Secondary column ────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-3">Customer Information</h2>
            <dl className="flex flex-col gap-2.5 text-sm font-sans">
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Name</dt>
                <dd className="text-text-primary">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Email</dt>
                <dd className="text-text-primary break-all">{customer.email}</dd>
              </div>
              {customer.phone && (
                <div>
                  <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Phone</dt>
                  <dd className="text-text-primary">{customer.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Account Status</dt>
                <dd><ProductStatusBadge status={customer.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary uppercase tracking-wide mb-0.5">Joined</dt>
                <dd className="text-text-primary">{customer.joinedAtFormatted}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
            <h2 className="text-sm font-sans font-semibold text-text-primary mb-1">Address</h2>
            {addr ? (
              <>
                <p className="text-[11px] font-sans text-text-secondary mb-3">From their most recent order.</p>
                <p className="text-sm font-sans text-text-primary leading-relaxed">
                  {addr.firstName} {addr.lastName}
                  <br />
                  {addr.address}
                  {addr.apartment ? `, ${addr.apartment}` : ''}
                  <br />
                  {addr.city}, {addr.state} {addr.pinCode}
                  <br />
                  {addr.country} &nbsp;·&nbsp; {addr.phone}
                </p>
              </>
            ) : (
              <p className="text-sm font-sans text-text-secondary mt-3">
                No address on file yet — this customer hasn&apos;t placed an order.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Bottom action */}
      <div className="flex items-center justify-end pb-2">
        <Link href="/admin/customers" className={secondaryButtonClasses}>
          Back to Customers
        </Link>
      </div>
    </div>
  )
}
