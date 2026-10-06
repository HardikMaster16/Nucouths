// ─────────────────────────────────────────────────────────────────────────────
// Nucouths Admin — Product Form (draft shapes + validation)
//
// Pure, storage-agnostic logic for the Add/Edit Product form: the draft
// types, slug/draft-key helpers, and validation. No localStorage, no mock
// catalog writes, no Prisma — safe to import from a client component, a
// Server Component, or a 'use server' action alike.
//
// lib/admin/product-service.ts re-exports everything here (so existing
// imports like `import { slugify } from '@/lib/admin/product-service'` keep
// working) and layers the actual persistence on top: today that's
// lib/admin/products.actions.ts (Prisma), for createProduct/updateProduct.
//
// `isSlugTaken` below checks the seed catalog only — it's best-effort,
// instant client-side feedback ahead of a real save. The authoritative
// slug/SKU uniqueness check happens server-side, against the real database,
// inside lib/admin/products.actions.ts — see instruction there for why the
// two don't need to agree in the rare case of a race.
// ─────────────────────────────────────────────────────────────────────────────

import { isSeedSlugTaken } from './products'
import { STANDARD_RETURNS, STANDARD_SHIPPING } from '@/lib/product-detail-data'
import type { AdminProductStatus } from './products'
import type { ProductDetail } from '@/lib/types'

// ─── Draft shapes (form-local, string-valued so inputs stay controlled) ────

export interface ProductImageDraft {
  key: string
  src: string
  alt: string
}

export interface ProductVariantDraft {
  key: string
  sku: string
  color: string
  colorHex: string
  size: string
  stock: string
  priceOverride: string
}

export interface ProductFormValues {
  name: string
  slug: string
  slugTouchedByUser: boolean
  description: string
  category: string
  collection: string
  productType: string
  status: AdminProductStatus
  /** Homepage "New In" section membership (Product.newIn). */
  newIn: boolean
  price: string
  compareAtPrice: string
  images: ProductImageDraft[]
  variants: ProductVariantDraft[]
  /** One bullet per line — matches Product.materials/details/care
   *  (String[] columns; prisma/schema.prisma) exactly, so this is just a
   *  line-delimited editing convenience over the same array, never a new
   *  field. Parsed back into a string[] in lib/admin/products.actions.ts's
   *  parseBulletList, filtering out blank lines. */
  materials: string
  details: string
  care: string
  /** Product.shipping/returns (String?) — free text, one paragraph each. */
  shipping: string
  returns: string
}

let draftKeyCounter = 0
export function makeDraftKey(prefix: string): string {
  draftKeyCounter += 1
  return `${prefix}-${draftKeyCounter}-${Date.now().toString(36)}`
}

export function emptyImageDraft(): ProductImageDraft {
  return { key: makeDraftKey('img'), src: '', alt: '' }
}

export function emptyVariantDraft(): ProductVariantDraft {
  return { key: makeDraftKey('variant'), sku: '', color: '', colorHex: '#111111', size: '', stock: '', priceOverride: '' }
}

export function createInitialProductForm(): ProductFormValues {
  return {
    name: '',
    slug: '',
    slugTouchedByUser: false,
    description: '',
    category: '',
    collection: '',
    productType: '',
    status: 'Active',
    newIn: false,
    price: '',
    compareAtPrice: '',
    images: [emptyImageDraft()],
    variants: [emptyVariantDraft()],
    materials: '',
    details: '',
    care: '',
    // Pre-filled with the same boilerplate every product silently got
    // before this field existed (lib/admin/products.actions.ts used to
    // hardcode STANDARD_SHIPPING/STANDARD_RETURNS on every create) — now
    // editable/clearable instead of fixed.
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
  }
}

// ─── Slug ───────────────────────────────────────────────────────────────────

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** True if `slug` is already used by the seed catalog — optionally excluding
 *  one id so editing a product doesn't flag its own slug. Only the instant,
 *  client-side check — see the module docstring above. */
export function isSlugTaken(slug: string, excludeId?: string): boolean {
  return isSeedSlugTaken(slug, excludeId)
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ProductFieldErrors {
  sku?: string
  color?: string
  size?: string
  stock?: string
  priceOverride?: string
  src?: string
  alt?: string
}

export interface ProductFormErrors {
  name?: string
  slug?: string
  category?: string
  price?: string
  compareAtPrice?: string
  images?: string
  imageFields?: Record<string, ProductFieldErrors>
  variantFields?: Record<string, ProductFieldErrors>
}

/** The string-valued top-level fields — narrower than `keyof
 *  ProductFormErrors` so a component reading `errors[field]` gets `string |
 *  undefined` back, not the union that also includes imageFields/
 *  variantFields' Record shape. */
export type ScalarProductField = 'name' | 'slug' | 'category' | 'price' | 'compareAtPrice'

/** A variant's Stock field (lib/types.ts's `ProductVariant.stock: number`) is
 *  valid when it's a whole number, 0 or greater — shared by validation below
 *  and by InventorySummary's completeness check, so the two never disagree
 *  about what counts as a valid stock value. */
export function isValidStockValue(stock: string): boolean {
  if (!stock.trim()) return false
  const n = Number(stock)
  return Number.isInteger(n) && n >= 0
}

/** A variant is complete when its four required fields — SKU, Color, Size,
 *  Stock (lib/types.ts's ProductVariant) — are all present and valid. Used
 *  by the Inventory summary to decide which rows count toward total stock,
 *  using the exact same rule validateProductForm uses to accept a variant. */
export function isVariantDraftComplete(v: ProductVariantDraft): boolean {
  return v.sku.trim() !== '' && v.color.trim() !== '' && v.size.trim() !== '' && isValidStockValue(v.stock)
}

export function hasFormErrors(errors: ProductFormErrors): boolean {
  return (
    Object.keys(errors).some((key) => key !== 'imageFields' && key !== 'variantFields' && errors[key as keyof ProductFormErrors]) ||
    !!(errors.imageFields && Object.keys(errors.imageFields).length) ||
    !!(errors.variantFields && Object.keys(errors.variantFields).length)
  )
}

/** Single source of truth for what's required/valid — mirrors
 *  lib/checkout-validation.ts's pattern (one pure function, no UI).
 *  `excludeId` is the product currently being edited (if any), so its own
 *  slug is never reported as a duplicate of itself. */
export function validateProductForm(values: ProductFormValues, excludeId?: string): ProductFormErrors {
  const errors: ProductFormErrors = {}

  if (!values.name.trim()) errors.name = 'Product name is required.'

  const slug = values.slug.trim()
  if (!slug) errors.slug = 'Slug is required.'
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use lowercase letters, numbers, and hyphens only.'
  else if (isSlugTaken(slug, excludeId)) errors.slug = 'This slug is already in use — choose another.'

  if (!values.category.trim()) errors.category = 'Category is required.'

  const price = Number(values.price)
  if (!values.price.trim()) errors.price = 'Price is required.'
  else if (!Number.isFinite(price) || price <= 0) errors.price = 'Enter a price greater than 0.'

  if (values.compareAtPrice.trim()) {
    const compareAt = Number(values.compareAtPrice)
    if (!Number.isFinite(compareAt) || compareAt <= 0) {
      errors.compareAtPrice = 'Enter a valid compare-at price.'
    } else if (Number.isFinite(price) && price > 0 && compareAt <= price) {
      errors.compareAtPrice = 'Compare-at price should be higher than the price.'
    }
  }

  // Images — the real Product/ProductDetail type requires at least one
  // (`images: [ProductImage, ...ProductImage[]]`), so this is enforced,
  // not just a UI preference.
  const imageFields: Record<string, ProductFieldErrors> = {}
  const filledImages = values.images.filter((img) => img.src.trim() || img.alt.trim())
  for (const img of values.images) {
    if (!img.src.trim() && !img.alt.trim()) continue
    const fe: ProductFieldErrors = {}
    if (!img.src.trim()) fe.src = 'Add an image or paste an image URL.'
    if (!img.alt.trim()) fe.alt = 'Describe the image for accessibility.'
    if (Object.keys(fe).length) imageFields[img.key] = fe
  }
  if (filledImages.length === 0) {
    errors.images = 'Add at least one product image.'
  } else if (Object.keys(imageFields).length) {
    errors.imageFields = imageFields
  }

  // Variants — blank rows are ignored (not everything has to be filled in),
  // but any row with content must be complete. lib/types.ts's
  // ProductVariant[] isn't a non-empty tuple like images, so zero *complete*
  // variants isn't a hard error here — VariantsSection surfaces that as a
  // non-blocking notice instead.
  const variantFields: Record<string, ProductFieldErrors> = {}
  for (const v of values.variants) {
    const hasContent = v.sku.trim() || v.color.trim() || v.size.trim() || v.stock.trim() || v.priceOverride.trim()
    if (!hasContent) continue
    const fe: ProductFieldErrors = {}
    if (!v.sku.trim()) fe.sku = 'SKU is required.'
    if (!v.color.trim()) fe.color = 'Color is required.'
    if (!v.size.trim()) fe.size = 'Size is required.'
    if (!v.stock.trim()) {
      fe.stock = 'Stock is required.'
    } else if (!isValidStockValue(v.stock)) {
      fe.stock = 'Enter a whole number, 0 or greater.'
    }
    if (v.priceOverride.trim()) {
      const priceOverride = Number(v.priceOverride)
      if (!Number.isFinite(priceOverride) || priceOverride <= 0) fe.priceOverride = 'Enter a valid price.'
    }
    if (Object.keys(fe).length) variantFields[v.key] = fe
  }
  if (Object.keys(variantFields).length) errors.variantFields = variantFields

  return errors
}

export class ProductValidationError extends Error {
  errors: ProductFormErrors
  constructor(errors: ProductFormErrors) {
    super('Product form validation failed')
    this.name = 'ProductValidationError'
    this.errors = errors
  }
}

// ─── Edit — hydrate the form from an existing product ──────────────────────

/** Reverse of the create path's draft → ProductDetail mapping — hydrates the
 *  Add Product form's exact draft shape from an existing product so the edit
 *  page reuses the same form/validation instead of a parallel one.
 *  `slugTouchedByUser` starts true: the slug was deliberately chosen already
 *  (by a previous save), so editing the name shouldn't silently rewrite it. */
export function productDetailToFormValues(detail: ProductDetail): ProductFormValues {
  return {
    name: detail.name,
    slug: detail.slug,
    slugTouchedByUser: true,
    description: detail.description ?? '',
    category: detail.category,
    collection: detail.collection ?? '',
    productType: detail.subcategory ?? '',
    status: detail.inStock ? 'Active' : 'Inactive',
    newIn: detail.newIn ?? false,
    price: String(detail.price),
    compareAtPrice: detail.compareAtPrice !== undefined ? String(detail.compareAtPrice) : '',
    images: detail.images.length
      ? detail.images.map((img) => ({ key: makeDraftKey('img'), src: img.src, alt: img.alt }))
      : [emptyImageDraft()],
    variants: detail.variants.length
      ? detail.variants.map((v) => ({
          key: makeDraftKey('variant'),
          sku: v.sku,
          color: v.color,
          colorHex: v.colorHex || '#111111',
          size: v.size,
          stock: String(v.stock),
          priceOverride: v.priceOverride !== undefined ? String(v.priceOverride) : '',
        }))
      : [emptyVariantDraft()],
    materials: detail.materials.join('\n'),
    details: detail.details.join('\n'),
    care: detail.care.join('\n'),
    shipping: detail.shipping,
    returns: detail.returns,
  }
}
