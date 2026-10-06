'use client'

import React from 'react'
import Link from 'next/link'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { EyeIcon, PencilIcon, TrashIcon, ProductsIcon } from '@/components/admin/icons'
import { ProductStatusBadge } from './ProductStatusBadge'
import { ProductStockBadge } from './ProductStockBadge'
import type { AdminProductRow } from '@/lib/admin/products'

interface ProductsTableProps {
  products: AdminProductRow[]
  totalCatalogCount: number
  onClearFilters: () => void
  onRequestDelete: (product: AdminProductRow) => void
}

function EmptyCatalogState() {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <ProductsIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No products yet</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        Your catalog is empty. Add your first product to start building the NUCOUTHS storefront.
      </p>
      <Button as="a" href="/admin/products/new" variant="primary" size="sm" className="mt-2">
        + Add Product
      </Button>
    </div>
  )
}

function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-secondary">
        <ProductsIcon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-text-primary">No matching products</h2>
      <p className="text-sm font-sans text-text-secondary max-w-sm">
        No products match your search and filters. Try adjusting or clearing them.
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

function IconLink({ href, ariaLabel, children }: { href: string; ariaLabel: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={ariaLabel} className={iconLinkClasses}>
      {children}
    </Link>
  )
}

export function ProductsTable({
  products,
  totalCatalogCount,
  onClearFilters,
  onRequestDelete,
}: ProductsTableProps) {
  if (totalCatalogCount === 0) {
    return (
      <div className="bg-white border border-border rounded-sm">
        <EmptyCatalogState />
      </div>
    )
  }

  if (products.length === 0) {
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
              <th scope="col" className="py-3 pl-4 pr-2 font-medium text-text-secondary text-xs uppercase tracking-wide w-16">
                Image
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Product
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Category
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Price
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Stock
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide">
                Status
              </th>
              <th scope="col" className="py-3 px-3 font-medium text-text-secondary text-xs uppercase tracking-wide whitespace-nowrap">
                Updated
              </th>
              <th scope="col" className="py-3 pl-3 pr-4 font-medium text-text-secondary text-xs uppercase tracking-wide text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-surface/40 transition-colors duration-100">
                <td className="py-2.5 pl-4 pr-2">
                  <div className="relative w-11 h-11 bg-surface rounded-sm overflow-hidden shrink-0">
                    <ImageWithFallback image={product.image} fill sizes="44px" className="rounded-sm" />
                  </div>
                </td>
                <td className="py-2.5 px-3 max-w-[240px]">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="block font-medium text-text-primary hover:underline underline-offset-2 truncate"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{product.sku}</p>
                </td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{product.categoryLabel}</td>
                <td className="py-2.5 px-3 text-text-primary font-medium text-right whitespace-nowrap">
                  {product.priceFormatted}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <ProductStockBadge totalStock={product.totalStock} stockState={product.stockState} />
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <ProductStatusBadge status={product.status} />
                </td>
                <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{product.updatedAtFormatted}</td>
                <td className="py-2.5 pl-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <IconLink href={`/admin/products/${product.id}`} ariaLabel={`View ${product.name}`}>
                      <EyeIcon className="w-4 h-4" />
                    </IconLink>
                    <IconLink href={`/admin/products/${product.id}/edit`} ariaLabel={`Edit ${product.name}`}>
                      <PencilIcon className="w-4 h-4" />
                    </IconLink>
                    <IconButton
                      aria-label={`Delete ${product.name}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => onRequestDelete(product)}
                      className="hover:text-sale"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — stacked cards, not a squeezed table */}
      <ul className="md:hidden divide-y divide-border">
        {products.map((product) => (
          <li key={product.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="relative w-14 h-14 bg-surface rounded-sm overflow-hidden shrink-0">
                <ImageWithFallback image={product.image} fill sizes="56px" className="rounded-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="block text-sm font-sans font-medium text-text-primary hover:underline underline-offset-2 truncate"
                >
                  {product.name}
                </Link>
                <p className="text-xs font-sans text-text-secondary mt-0.5">{product.sku}</p>
                <p className="text-xs font-sans text-text-secondary mt-0.5">{product.categoryLabel}</p>
              </div>
              <span className="text-sm font-sans font-medium text-text-primary shrink-0">
                {product.priceFormatted}
              </span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <ProductStockBadge totalStock={product.totalStock} stockState={product.stockState} />
                <ProductStatusBadge status={product.status} />
              </div>
              <span className="text-xs font-sans text-text-secondary">Updated {product.updatedAtFormatted}</span>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border/70 -mx-4 px-4 mt-1">
              <Link
                href={`/admin/products/${product.id}`}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <EyeIcon className="w-3.5 h-3.5" /> View
              </Link>
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <PencilIcon className="w-3.5 h-3.5" /> Edit
              </Link>
              <button
                type="button"
                onClick={() => onRequestDelete(product)}
                aria-label={`Delete ${product.name}`}
                className="w-9 h-9 shrink-0 flex items-center justify-center text-text-secondary hover:text-sale bg-surface hover:bg-border rounded-sm transition-colors duration-150"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
