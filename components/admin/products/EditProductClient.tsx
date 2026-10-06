'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  productDetailToFormValues,
  updateProduct,
  hasFormErrors,
  validateProductForm,
  ProductValidationError,
} from '@/lib/admin/product-service'
import type { ProductFormValues } from '@/lib/admin/product-service'
import { AlertIcon } from '@/components/admin/icons'
import { BasicInfoSection } from './form/BasicInfoSection'
import { PricingSection } from './form/PricingSection'
import { ImagesSection } from './form/ImagesSection'
import { VariantsSection } from './form/VariantsSection'
import { ProductInformationSection } from './form/ProductInformationSection'
import { InventorySummary } from './form/InventorySummary'
import { ProductNotFound } from './ProductNotFound'
import type { ProductDetail } from '@/lib/types'

interface CategoryOption {
  value: string
  label: string
}

interface EditProductClientProps {
  id: string
  /** Server-rendered Prisma product detail (lib/admin/products.db.ts),
   *  when the id matches one — the only source this form reads from. */
  seedDetail?: ProductDetail
  categoryOptions: CategoryOption[]
  collectionOptions: string[]
  productTypeOptions: string[]
}

type TouchedMap = Partial<Record<'name' | 'slug' | 'category' | 'price' | 'compareAtPrice', boolean>>

const ALL_TOP_LEVEL_TOUCHED: TouchedMap = {
  name: true,
  slug: true,
  category: true,
  price: true,
  compareAtPrice: true,
}

export function EditProductClient({
  id,
  seedDetail,
  categoryOptions,
  collectionOptions,
  productTypeOptions,
}: EditProductClientProps) {
  const router = useRouter()

  const [original, setOriginal] = useState<ProductDetail | null>(seedDetail ?? null)
  const [values, setValues] = useState<ProductFormValues | null>(
    seedDetail ? productDetailToFormValues(seedDetail) : null
  )

  const [touched, setTouched] = useState<TouchedMap>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // The Prisma product detail (lib/admin/products.db.ts) is the only source
  // this form reads from — re-derive form state whenever the server-resolved
  // product for this id changes (e.g. navigating between two edit pages).
  useEffect(() => {
    setOriginal(seedDetail ?? null)
    setValues(seedDetail ? productDetailToFormValues(seedDetail) : null)
  }, [id, seedDetail])

  const errors = useMemo(() => (values ? validateProductForm(values, id) : {}), [values, id])
  const isFormValid = !hasFormErrors(errors)

  function handleChange(patch: Partial<ProductFormValues>) {
    setValues((prev) => (prev ? { ...prev, ...patch } : prev))
    if (submitError) setSubmitError(null)
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    setTouched(ALL_TOP_LEVEL_TOUCHED)
    if (!values || !original || !isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const updated = await updateProduct(original, values, { isLocal: false })
      router.push(`/admin/products?updated=${encodeURIComponent(updated.name)}`)
    } catch (err) {
      if (err instanceof ProductValidationError) {
        setSubmitError(
          err.errors.slug ?? 'Some fields need attention before this product can be saved. Please review and try again.'
        )
      } else {
        setSubmitError("Couldn't save this product. Please try again.")
      }
      setIsSubmitting(false)
    }
  }

  const breadcrumb = (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-xs font-sans text-text-secondary">
        <li>
          <Link href="/admin" className="hover:text-text-primary transition-colors duration-150">
            Admin
          </Link>
        </li>
        <li aria-hidden="true" className="select-none">›</li>
        <li>
          <Link href="/admin/products" className="hover:text-text-primary transition-colors duration-150">
            Products
          </Link>
        </li>
        <li aria-hidden="true" className="select-none">›</li>
        <li aria-current="page" className="text-text-primary font-medium">
          Edit Product
        </li>
      </ol>
    </nav>
  )

  if (!values || !original) {
    return (
      <div className="flex flex-col gap-6">
        {breadcrumb}
        <ProductNotFound />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {breadcrumb}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/products"
            className="text-xs font-sans font-medium tracking-wider uppercase text-text-secondary hover:text-text-primary underline underline-offset-4 hover:no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary rounded"
          >
            ← Back to Products
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-text-primary leading-tight mt-2">
            Edit Product
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/admin/products"
            className="inline-flex items-center h-11 px-5 text-sm font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="edit-product-form"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="inline-flex items-center gap-2 h-11 px-6 text-sm font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {submitError && (
        <div role="alert" className="border border-sale/30 bg-sale/5 text-sale rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans">
          <AlertIcon className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {hasAttemptedSubmit && !isFormValid && (
        <div role="alert" className="border border-sale/30 bg-sale/5 text-sale rounded-sm p-3 flex items-center gap-2.5 text-sm font-sans">
          <AlertIcon className="w-4 h-4 shrink-0" />
          <span>Please fix the highlighted fields before saving.</span>
        </div>
      )}

      <form id="edit-product-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <BasicInfoSection
          values={values}
          errors={errors}
          touched={touched}
          categoryOptions={categoryOptions}
          collectionOptions={collectionOptions}
          productTypeOptions={productTypeOptions}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <PricingSection values={values} errors={errors} touched={touched} onChange={handleChange} onBlur={handleBlur} />

        <ImagesSection
          images={values.images}
          errors={errors}
          showErrors={hasAttemptedSubmit}
          onImagesChange={(images) => handleChange({ images })}
        />

        <VariantsSection
          variants={values.variants}
          errors={errors}
          showErrors={hasAttemptedSubmit}
          onVariantsChange={(variants) => handleChange({ variants })}
          productIdentifier={values.slug || values.name}
        />

        <InventorySummary variants={values.variants} />

        <ProductInformationSection values={values} onChange={handleChange} />

        <div className="flex items-center justify-end gap-3 pb-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center h-11 px-5 text-sm font-sans font-medium uppercase tracking-wide text-text-primary bg-surface hover:bg-border rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="inline-flex items-center gap-2 h-11 px-6 text-sm font-sans font-medium uppercase tracking-wide text-white bg-text-primary hover:bg-[#2a2a2a] rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
