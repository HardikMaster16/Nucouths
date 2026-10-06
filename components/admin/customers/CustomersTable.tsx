'use client'

import React from 'react'
import Link from 'next/link'
import { EyeIcon, CustomersIcon } from '@/components/admin/icons'
import { ProductStatusBadge } from '@/components/admin/products/ProductStatusBadge'
import type { AdminCustomerRow } from '@/lib/admin/customers'

interface CustomersTableProps {
  customers: AdminCustomerRow[]
  totalCustomerCount: number
  onClearFilters: () => void
}

function initialsFor(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function CustomerIdentity({ customer }: { customer: AdminCustomerRow }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-full bg-text-primary text-white flex items-center justify-center text-[11px] font-sans font-semibold shrink-0">
        {initialsFor(customer.name)}
      </div>
      <Link
        href={`/admin/customers/${customer.id}`}
        className="font-medium text-text-primary hover:underline underline-offset-2 truncate"
      >
        {customer.name}
      </Link>
    </div>
  )
}

function EmptyCustomersState() {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <CustomersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No customers yet</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        Customer accounts will show up here once people start creating them.
      </p>
    </div>
  )
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <CustomersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No matching customers</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        No customers match your search and filters. Try adjusting or clearing them.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-1 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        Clear Filters
      </button>
    </div>
  )
}

const iconLinkClasses =
  'relative inline-flex items-center justify-center w-7 h-7 rounded-sm text-text-primary bg-transparent hover:bg-surface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-1'

export function CustomersTable({ customers, totalCustomerCount, onClearFilters }: CustomersTableProps) {
  if (totalCustomerCount === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <EmptyCustomersState />
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <NoResultsState onClearFilters={onClearFilters} />
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-sm overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border text-left bg-surface/60">
              <th scope="col" className="py-3 pl-4 pr-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Customer
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Email
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Orders
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Total Spent
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">
                Joined
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Status
              </th>
              <th scope="col" className="py-3 pl-3 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-surface/40 transition-colors duration-100">
                <td className="py-2.5 pl-4 pr-3 max-w-[200px]">
                  <CustomerIdentity customer={customer} />
                </td>
                <td className="py-2.5 px-3 text-text-secondary truncate max-w-[220px]">{customer.email}</td>
                <td className="py-2.5 px-3 text-text-primary text-right">{customer.orderCount}</td>
                <td className="py-2.5 px-3 text-text-primary font-medium text-right whitespace-nowrap">
                  {customer.totalSpentFormatted}
                </td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{customer.joinedAtFormatted}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <ProductStatusBadge status={customer.status} />
                </td>
                <td className="py-2.5 pl-3 pr-4">
                  <div className="flex items-center justify-end">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      aria-label={`View ${customer.name}`}
                      className={iconLinkClasses}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards, not a squeezed table */}
      <ul className="md:hidden divide-y divide-border">
        {customers.map((customer) => (
          <li key={customer.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <CustomerIdentity customer={customer} />
              <ProductStatusBadge status={customer.status} />
            </div>
            <p className="text-xs font-sans text-text-secondary truncate">{customer.email}</p>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-sans text-text-secondary">
              <span>{customer.orderCount} order{customer.orderCount === 1 ? '' : 's'}</span>
              <span className="text-text-primary font-medium">{customer.totalSpentFormatted}</span>
              <span>Joined {customer.joinedAtFormatted}</span>
            </div>

            <div className="pt-1 border-t border-border/70 -mx-4 px-4 mt-1">
              <Link
                href={`/admin/customers/${customer.id}`}
                className="w-full h-9 flex items-center justify-center gap-1.5 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <EyeIcon className="w-3.5 h-3.5" /> View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
