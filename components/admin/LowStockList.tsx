import React from 'react'
import Link from 'next/link'
import type { LowStockRow } from '@/lib/admin/dashboard.db'

interface LowStockListProps {
  products: LowStockRow[]
}

export function LowStockList({ products }: LowStockListProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm font-sans text-text-secondary py-10 text-center">
        No products currently require restocking.
      </p>
    )
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {products.map((row) => {
          const soldOut = row.stock <= 0
          return (
            <li key={`${row.productId}-${row.color}-${row.size}`} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/products/${row.slug}`}
                  target="_blank"
                  className="text-sm font-sans font-medium text-text-primary hover:underline underline-offset-2 truncate block"
                >
                  {row.productName}
                </Link>
                <p className="text-xs font-sans text-text-secondary mt-0.5">
                  {row.color} · {row.size}
                </p>
              </div>
              <span
                className={[
                  'shrink-0 text-xs font-sans font-semibold px-2 py-1 rounded-sm border',
                  soldOut
                    ? 'text-sale border-sale/30 bg-sale/5'
                    : 'text-[#B45309] border-[#B45309]/30 bg-[#B45309]/5',
                ].join(' ')}
              >
                {soldOut ? 'Sold Out' : `${row.stock} left`}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="pt-4 mt-1 border-t border-border">
        <Link
          href="/admin/inventory"
          className="text-xs font-sans font-medium tracking-wider uppercase text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
        >
          View Inventory →
        </Link>
      </div>
    </>
  )
}
