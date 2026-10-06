'use client'

import React from 'react'
import { variantStockState } from '@/lib/product-detail-data'
import { ProductStockBadge } from '@/components/admin/products/ProductStockBadge'
import { isVariantDraftComplete } from '@/lib/admin/product-service'
import type { ProductVariantDraft } from '@/lib/admin/product-service'

interface InventorySummaryProps {
  variants: ProductVariantDraft[]
}

/** Read-only — stock always comes from the Variants section above, never a
 *  separate input, so there's exactly one place inventory can be wrong.
 *  Uses the same completeness rule as form validation (isVariantDraftComplete,
 *  in lib/admin/product-service.ts) so a variant that's valid enough to save
 *  is never shown here as "incomplete". */
export function InventorySummary({ variants }: InventorySummaryProps) {
  const complete = variants.filter(isVariantDraftComplete)
  const totalStock = complete.reduce((sum, v) => sum + Number(v.stock), 0)

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Inventory</h2>

      {complete.length === 0 ? (
        <p className="text-sm font-sans text-text-secondary">
          No complete variants yet — add at least one to track stock. Total stock is always calculated from the
          variants above.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Total Stock</p>
            <p className="text-2xl font-sans font-semibold text-text-primary leading-none">{totalStock}</p>
          </div>
          <div>
            <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Variants</p>
            <p className="text-2xl font-sans font-semibold text-text-primary leading-none">{complete.length}</p>
          </div>
          <div>
            <p className="text-xs font-sans text-text-secondary uppercase tracking-wide mb-1">Status</p>
            <ProductStockBadge totalStock={totalStock} stockState={variantStockState(totalStock)} />
          </div>
        </div>
      )}
    </section>
  )
}
