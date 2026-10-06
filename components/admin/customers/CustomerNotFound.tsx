import React from 'react'
import Link from 'next/link'
import { CustomersIcon } from '@/components/admin/icons'

/** The admin panel's "customer not found" state — an invalid/unknown
 *  customer id gets this instead of an empty page. */
export function CustomerNotFound() {
  return (
    <div className="bg-white border border-border rounded-sm p-8 sm:p-12 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <CustomersIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-2xl text-text-primary leading-tight">Customer not found</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        This customer doesn&apos;t exist. Double-check the customer ID and try again from the customers list.
      </p>
      <Link
        href="/admin/customers"
        className="mt-3 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        ← Back to Customers
      </Link>
    </div>
  )
}
