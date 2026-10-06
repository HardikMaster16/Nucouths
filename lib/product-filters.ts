// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Product filter / sort / facet logic
//
// This module is intentionally pure and data-source agnostic.
// To switch from mock data to an API, replace the `products` import below with
// an async function that fetches from your backend — no component changes needed.
// ─────────────────────────────────────────────────────────────────────────────

import { products } from './mock-data'
import type { Product } from './types'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name-asc'

export interface FilterParams {
  /** Free-text search query (e.g. from /search?q=…). Case-insensitive,
   *  matched against name/category/subcategory/description/brand/tags/colours.
   *  Applied before every other filter — facet counts below reflect the
   *  query-matched set, not the whole catalog, so filter options never
   *  promise results the search wouldn't actually contain. */
  query?: string
  /** 'men' | 'women' | 'all' | undefined */
  category?: string
  /** 'tops' | 'trousers' | 'outerwear' | 'dresses' | 'accessories' */
  subcategory?: string
  /** Exact match against Product.collection, e.g. 'Autumn / Winter 2025' —
   *  see lib/collections.ts. Like `query`, this is a fixed page scope: it
   *  narrows facet counts too, not just the result list. */
  collection?: string
  /** Fixed *scope* constraint for badge-type collections (comma list, OR'd
   *  — e.g. 'NEW,LIMITED' for "New In", see lib/collections.ts). Narrows
   *  facet counts like `query`/`collection`. Distinct from `badge` below,
   *  which is the togglable Availability *refinement* filter and must NOT
   *  narrow other facets' counts (so a shopper can still see how many SALE
   *  items exist while only NEW is checked). */
  badgeIn?: string
  sort?: SortOption | string
  /** 'NEW' | 'SALE' | 'LIMITED' | 'SOLD OUT', or a comma-separated list to
   *  OR them together — the Availability filter checkboxes. */
  badge?: string
  /** Comma-separated clothing or waist sizes: 'S,M,L' or '30,32' */
  size?: string
  /** Comma-separated colour names: 'Camel,Navy' */
  color?: string
  minPrice?: number
  maxPrice?: number
}

export interface FacetOption {
  value: string
  label: string
  count: number
}

export interface ColorFacetOption {
  name: string
  hex: string
  count: number
}

export interface FilterResult {
  products: Product[]
  total: number
  facets: {
    categories: FacetOption[]
    subcategories: FacetOption[]
    badges: FacetOption[]
    /** Clothing sizes: XS S M L XL XXL */
    clothingSizes: string[]
    /** Numeric waist sizes: 28 30 32 … */
    waistSizes: string[]
    colors: ColorFacetOption[]
    priceRange: { min: number; max: number }
  }
}

// ─── Sort options (shared between server and client) ──────────────────────────

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A–Z' },
]

// ─── Size classification ──────────────────────────────────────────────────────

/** The app's de facto standard clothing-size scale — also the fallback size
 *  palette components/admin/products/form/VariantGroupsSection.tsx offers
 *  when a product has no sizes of its own yet (components/product/
 *  SizeSelector.tsx keeps its own copy for the identical clothing-vs-waist
 *  split; kept separate rather than imported there to avoid pulling this
 *  filtering module into the storefront's variant-selection bundle). */
export const CLOTHING_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

function classifySize(s: string): 'clothing' | 'waist' {
  return CLOTHING_SIZE_ORDER.includes(s) ? 'clothing' : 'waist'
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = CLOTHING_SIZE_ORDER.indexOf(a)
    const bi = CLOTHING_SIZE_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return parseInt(a, 10) - parseInt(b, 10)
  })
}

// ─── Search matching ───────────────────────────────────────────────────────────

/** Trims, collapses internal whitespace, and lowercases — used for matching
 *  only (see normalizeSearchQuery for the display/URL form, which keeps
 *  the user's original casing). */
function normalizeQueryForMatch(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Trims and collapses whitespace without lowercasing — the canonical form
 *  for the ?q= URL param and the search input's displayed value. Returns ''
 *  for a whitespace-only query so callers can treat it as "no query". */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function productSearchableText(p: Product): string {
  return [
    p.name,
    p.category,
    p.subcategory,
    p.brand,
    p.badge,
    p.description,
    ...(p.tags ?? []),
    ...(p.colors ?? []).map((c) => c.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** Every word in the query must appear somewhere in the product's searchable
 *  text (order-independent) — so "black shirt" matches a product named
 *  "Oversized Shirt" whose colour options include "Black" even though the
 *  two words come from different fields. */
function matchesQuery(product: Product, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true
  const haystack = productSearchableText(product)
  return normalizedQuery.split(' ').every((word) => haystack.includes(word))
}

// ─── Main filter function ─────────────────────────────────────────────────────

/** The exact same filter/sort/facet algorithm getFilteredProducts always
 *  used, factored out so it can run over any product array — not just the
 *  mock catalog import below. This is what makes the "replace the products
 *  import" swap possible without duplicating the algorithm: a Prisma-backed
 *  caller (lib/products.db.ts, used by /products and /products/[slug]) can
 *  fetch its own array and call this directly, while getFilteredProducts
 *  itself (below) — and therefore every one of its existing callers
 *  (/collections, /search) — keeps behaving exactly as it always did,
 *  completely unaffected. */
export function computeFilteredProducts(source: Product[], params: FilterParams): FilterResult {
  const normalizedQuery = params.query ? normalizeQueryForMatch(params.query) : ''
  const wantedScopeBadges = params.badgeIn
    ? params.badgeIn.split(',').map((b) => b.trim()).filter(Boolean)
    : null

  // 1. Start from full source (replace with API call when ready), narrowed by
  //    the page's fixed scope first — search query, named collection, and/or
  //    badge-collection (badgeIn) — before any togglable filter or facet
  //    count is computed. These three are never removable via a filter
  //    control (there's no "clear collection" checkbox), unlike `badge`
  //    below, which IS a togglable Availability refinement and so must NOT
  //    narrow facet counts the same way.
  const scoped: Product[] = source.filter((p) => {
    if (normalizedQuery && !matchesQuery(p, normalizedQuery)) return false
    if (params.collection && p.collection !== params.collection) return false
    if (wantedScopeBadges && (!p.badge || !wantedScopeBadges.includes(p.badge))) return false
    return true
  })
  let result: Product[] = [...scoped]

  // 2. Apply filters sequentially
  if (params.category && params.category !== 'all') {
    result = result.filter((p) => p.category === params.category)
  }

  if (params.subcategory) {
    result = result.filter((p) => p.subcategory === params.subcategory)
  }

  if (params.badge) {
    // Comma-separated OR list, matching the existing size/color convention —
    // lets a "New In" collection mean badge NEW *or* LIMITED (see
    // lib/collections.ts) without a second filter mechanism.
    const wantedBadges = params.badge.split(',').map((b) => b.trim()).filter(Boolean)
    result = result.filter((p) => !!p.badge && wantedBadges.includes(p.badge))
  }

  if (params.size) {
    const wanted = params.size.split(',').map((s) => s.trim()).filter(Boolean)
    result = result.filter((p) => p.sizes?.some((s) => wanted.includes(s)))
  }

  if (params.color) {
    const wantedColors = params.color.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
    result = result.filter((p) =>
      p.colors?.some((c) => wantedColors.includes(c.name.toLowerCase()))
    )
  }

  if (params.minPrice !== undefined) {
    result = result.filter((p) => p.price >= params.minPrice!)
  }

  if (params.maxPrice !== undefined) {
    result = result.filter((p) => p.price <= params.maxPrice!)
  }

  // 3. Sort
  switch (params.sort) {
    case 'price-asc':
      result = [...result].sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result = [...result].sort((a, b) => b.price - a.price)
      break
    case 'newest': {
      const newFirst = ['NEW', 'LIMITED']
      result = [...result].sort((a, b) => {
        const aNew = newFirst.includes(a.badge ?? '') ? 0 : 1
        const bNew = newFirst.includes(b.badge ?? '') ? 0 : 1
        return aNew - bNew
      })
      break
    }
    case 'name-asc':
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
      break
    default:
      break // 'featured' keeps source order
  }

  // 4. Build facets from the scoped source (unfiltered by category/size/
  //    badge/etc — counts are always over everything the page's fixed scope
  //    matches, so a filter option's count never promises results outside
  //    that scope). With no query/collection/badgeIn, this is every product —
  //    identical to the plain-catalogue behaviour /products relies on.
  const facetSource = scoped
  const countByKey = (key: keyof Product, value: string) =>
    facetSource.filter((p) => p[key] === value).length

  const categories: FacetOption[] = [
    { value: 'all', label: 'All Products', count: facetSource.length },
    { value: 'women', label: 'Women', count: countByKey('category', 'women') },
    { value: 'men', label: 'Men', count: countByKey('category', 'men') },
  ]

  // Subcategories scoped to active category
  const subSource =
    params.category && params.category !== 'all'
      ? facetSource.filter((p) => p.category === params.category)
      : facetSource
  const subMap = new Map<string, number>()
  subSource.forEach((p) => {
    if (p.subcategory) subMap.set(p.subcategory, (subMap.get(p.subcategory) ?? 0) + 1)
  })
  const subcategories: FacetOption[] = [...subMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, c]) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
      count: c,
    }))

  const badges: FacetOption[] = [
    { value: 'NEW', label: 'New In', count: countByKey('badge', 'NEW') },
    { value: 'SALE', label: 'On Sale', count: countByKey('badge', 'SALE') },
    { value: 'LIMITED', label: 'Limited', count: countByKey('badge', 'LIMITED') },
  ].filter((b) => b.count > 0)

  // Sizes — split into clothing and waist
  const allSizeSet = new Set(facetSource.flatMap((p) => p.sizes ?? []))
  const allSizesSorted = sortSizes([...allSizeSet])
  const clothingSizes = allSizesSorted.filter((s) => classifySize(s) === 'clothing')
  const waistSizes = allSizesSorted.filter((s) => classifySize(s) === 'waist')

  // Colors — deduplicated by name, sorted by frequency
  const colorMap = new Map<string, string>() // name → hex (first occurrence wins)
  facetSource.forEach((p) =>
    p.colors?.forEach((c) => {
      if (!colorMap.has(c.name)) colorMap.set(c.name, c.hex)
    })
  )
  const colors: ColorFacetOption[] = [...colorMap.entries()]
    .map(([name, hex]) => ({
      name,
      hex,
      count: facetSource.filter((p) => p.colors?.some((c) => c.name === name)).length,
    }))
    .sort((a, b) => b.count - a.count)

  // Price range — falls back to the full catalog's range when the query
  // matches nothing, so the price slider never computes Math.min/max over an
  // empty array (which would be Infinity/-Infinity).
  const priceSource = facetSource.length > 0 ? facetSource : source
  const prices = priceSource.map((p) => p.price)
  const priceRange = { min: Math.min(...prices), max: Math.max(...prices) }

  return {
    products: result,
    total: result.length,
    facets: { categories, subcategories, badges, clothingSizes, waistSizes, colors, priceRange },
  }
}

/** Mock-catalog entry point. /collections, /collections/[slug], and
 *  /search now call lib/products.db.ts's getFilteredProductsFromDb (the
 *  same computeFilteredProducts algorithm, over the real Prisma catalog)
 *  instead — this synchronous wrapper has no remaining callers, kept only
 *  in case something still needs the mock catalog specifically. */
export function getFilteredProducts(params: FilterParams): FilterResult {
  return computeFilteredProducts(products, params)
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export function categoryLabel(category?: string, badge?: string): string {
  if (badge === 'SALE') return 'Sale'
  if (badge === 'NEW') return 'New In'
  if (badge === 'LIMITED') return 'Limited Edition'
  if (category === 'men') return "Men's Collection"
  if (category === 'women') return "Women's Collection"
  return 'All Products'
}
