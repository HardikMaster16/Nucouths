'use client'

import React from 'react'
import { FormField, fieldInputClass } from '@/components/checkout/FormField'
import { slugify } from '@/lib/admin/product-service'
import type { ProductFormErrors, ProductFormValues, ScalarProductField } from '@/lib/admin/product-service'
import type { AdminProductStatus } from '@/lib/admin/products'

interface CategoryOption {
  value: string
  label: string
}

interface BasicInfoSectionProps {
  values: ProductFormValues
  errors: ProductFormErrors
  touched: Record<string, boolean>
  categoryOptions: CategoryOption[]
  collectionOptions: string[]
  productTypeOptions: string[]
  onChange: (patch: Partial<ProductFormValues>) => void
  onBlur: (field: string) => void
}

export function BasicInfoSection({
  values,
  errors,
  touched,
  categoryOptions,
  collectionOptions,
  productTypeOptions,
  onChange,
  onBlur,
}: BasicInfoSectionProps) {
  const errorFor = (field: ScalarProductField) => (touched[field] ? errors[field] : undefined)
  const invalid = (field: ScalarProductField) => !!(touched[field] && errors[field])

  function handleNameChange(value: string) {
    // Keep slug in sync with the name until the admin edits it directly —
    // same "auto then override" UX as most CMS slug fields.
    const patch: Partial<ProductFormValues> = { name: value }
    if (!values.slugTouchedByUser) patch.slug = slugify(value)
    onChange(patch)
  }

  return (
    <section className="bg-white border border-border rounded-sm p-5 sm:p-6">
      <h2 className="text-sm font-sans font-semibold text-text-primary mb-4">Basic Information</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <FormField label="Product Name" htmlFor="product-name" required error={errorFor('name')}>
          <input
            id="product-name"
            name="name"
            type="text"
            required
            placeholder="Structured Wool Blazer"
            value={values.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => onBlur('name')}
            aria-invalid={invalid('name')}
            aria-describedby={invalid('name') ? 'product-name-error' : undefined}
            className={fieldInputClass(invalid('name'))}
          />
        </FormField>

        <FormField
          label="Slug"
          htmlFor="product-slug"
          required
          error={errorFor('slug')}
        >
          <input
            id="product-slug"
            name="slug"
            type="text"
            required
            placeholder="structured-wool-blazer"
            value={values.slug}
            onChange={(e) => onChange({ slug: slugify(e.target.value), slugTouchedByUser: true })}
            onBlur={() => onBlur('slug')}
            aria-invalid={invalid('slug')}
            aria-describedby={invalid('slug') ? 'product-slug-error' : undefined}
            className={fieldInputClass(invalid('slug')) + ' font-mono text-[13px]'}
          />
        </FormField>

        <FormField label="Description" htmlFor="product-description" className="sm:col-span-2">
          <textarea
            id="product-description"
            name="description"
            rows={4}
            placeholder="A short description of the product…"
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-sm border border-border bg-white text-sm font-sans text-text-primary placeholder:text-text-secondary/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus:border-text-primary resize-y"
          />
        </FormField>

        <FormField label="Category" htmlFor="product-category" required error={errorFor('category')}>
          <select
            id="product-category"
            name="category"
            required
            value={values.category}
            onChange={(e) => onChange({ category: e.target.value })}
            onBlur={() => onBlur('category')}
            aria-invalid={invalid('category')}
            aria-describedby={invalid('category') ? 'product-category-error' : undefined}
            className={fieldInputClass(invalid('category'))}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Collection" htmlFor="product-collection">
          <select
            id="product-collection"
            name="collection"
            value={values.collection}
            onChange={(e) => onChange({ collection: e.target.value })}
            className={fieldInputClass(false)}
          >
            <option value="">No collection</option>
            {collectionOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Product Type" htmlFor="product-type">
          <select
            id="product-type"
            name="productType"
            value={values.productType}
            onChange={(e) => onChange({ productType: e.target.value })}
            className={fieldInputClass(false)}
          >
            <option value="">No product type</option>
            {productTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Status" htmlFor="product-status">
          <select
            id="product-status"
            name="status"
            value={values.status}
            onChange={(e) => onChange({ status: e.target.value as AdminProductStatus })}
            className={fieldInputClass(false)}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </FormField>

        <FormField label="New In" htmlFor="product-new-in">
          <select
            id="product-new-in"
            name="newIn"
            value={values.newIn ? 'yes' : 'no'}
            onChange={(e) => onChange({ newIn: e.target.value === 'yes' })}
            className={fieldInputClass(false)}
          >
            <option value="no">No</option>
            <option value="yes">Yes — show in homepage New In</option>
          </select>
        </FormField>
      </div>
    </section>
  )
}
