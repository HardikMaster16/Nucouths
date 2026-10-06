import React from 'react'
import Link from 'next/link'

/** The admin panel's "product not found" state — shared by the product
 *  detail view and edit pages so an unknown/deleted id gets the same
 *  experience everywhere instead of each page inventing its own. */
export function ProductNotFound() {
  return (
    <div className="bg-white border border-border rounded-sm p-8 sm:p-12 flex flex-col items-center text-center gap-3">
      <h2 className="font-display text-2xl text-text-primary leading-tight">Product not found</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        This product doesn&apos;t exist, or may have been deleted.
      </p>
      <Link
        href="/admin/products"
        className="mt-3 text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
      >
        ← Back to Products
      </Link>
    </div>
  )
}
