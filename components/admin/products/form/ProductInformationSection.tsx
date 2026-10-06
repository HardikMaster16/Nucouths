'use client'

import React from 'react'
import { FormField } from '@/components/checkout/FormField'
import type { ProductFormValues } from '@/lib/admin/product-service'

interface ProductInformationSectionProps {
  values: ProductFormValues
  onChange: (patch: Partial<ProductFormValues>) => void
}

const textareaClass =
  'w-full px-3.5 py-2.5 rounded-sm border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus:border-text-primary resize-y'

/** Feeds the storefront PDP's remaining three accordion sections
 *  (components/product/ProductClient.tsx — Details & Materials, Care
 *  Instructions, Shipping & Returns; Description itself is already an
 *  editable field in BasicInfoSection above). Every field here maps
 *  directly onto an existing Product column (prisma/schema.prisma) — no
 *  schema change: materials/details/care are String[] columns edited here
 *  as one bullet per line (lib/admin/products.actions.ts's parseBulletList
 *  turns that back into the array on save), and shipping/returns are the
 *  existing String? columns edited as plain paragraphs. */
export function ProductInformationSection({ values, onChange }: ProductInformationSectionProps) {
  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-1">Product Information</h2>
      <p className="text-xs font-sans text-text-secondary mb-5">
        Powers the Details &amp; Materials, Care Instructions, and Shipping &amp; Returns accordion sections on the
        product page. Leave a field blank to hide that part of a section — customers never see an empty heading.
      </p>

      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-xs font-sans font-semibold uppercase tracking-wide text-text-secondary mb-3">
            Details &amp; Materials
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Materials" htmlFor="product-materials">
              <textarea
                id="product-materials"
                rows={4}
                placeholder={'One per line, e.g.\n80% Merino Wool\n20% Nylon'}
                value={values.materials}
                onChange={(e) => onChange({ materials: e.target.value })}
                className={textareaClass}
              />
            </FormField>

            <FormField label="Details" htmlFor="product-details">
              <textarea
                id="product-details"
                rows={4}
                placeholder={'One per line, e.g.\nRegular fit\nSolid pattern\nSide pockets'}
                value={values.details}
                onChange={(e) => onChange({ details: e.target.value })}
                className={textareaClass}
              />
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-sans font-semibold uppercase tracking-wide text-text-secondary mb-3">
            Care Instructions
          </h3>
          <FormField label="Care Instructions" htmlFor="product-care">
            <textarea
              id="product-care"
              rows={3}
              placeholder={'One per line, e.g.\nMachine wash cold\nDo not bleach\nTumble dry low'}
              value={values.care}
              onChange={(e) => onChange({ care: e.target.value })}
              className={textareaClass}
            />
          </FormField>
        </div>

        <div>
          <h3 className="text-xs font-sans font-semibold uppercase tracking-wide text-text-secondary mb-3">
            Shipping &amp; Returns
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Shipping Information" htmlFor="product-shipping">
              <textarea
                id="product-shipping"
                rows={4}
                placeholder="Free standard shipping on orders above ₹2,999…"
                value={values.shipping}
                onChange={(e) => onChange({ shipping: e.target.value })}
                className={textareaClass}
              />
            </FormField>

            <FormField label="Return Policy" htmlFor="product-returns">
              <textarea
                id="product-returns"
                rows={4}
                placeholder="Free returns within 30 days of delivery…"
                value={values.returns}
                onChange={(e) => onChange({ returns: e.target.value })}
                className={textareaClass}
              />
            </FormField>
          </div>
        </div>
      </div>
    </section>
  )
}
