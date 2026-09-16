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
  /** 'men' | 'women' | 'all' | undefined */
  category?: string
  /** 'tops' | 'trousers' | 'outerwear' | 'dresses' | 'accessories' */
  subcategory?: string
  sort?: SortOption | string
  /** 'NEW' | 'SALE' | 'LIMITED' | 'SOLD OUT' */
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

const CLOTHING_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

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

// ─── Main filter function ─────────────────────────────────────────────────────

export function getFilteredProducts(params: FilterParams): FilterResult {
  // 1. Start from full source (replace with API call when ready)
  let result: Product[] = [...products]

  // 2. Apply filters sequentially
  if (params.category && params.category !== 'all') {
    result = result.filter((p) => p.category === params.category)
  }

  if (params.subcategory) {
    result = result.filter((p) => p.subcategory === params.subcategory)
  }

  if (params.badge) {
    result = result.filter((p) => p.badge === params.badge)
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

  // 4. Build facets from full unfiltered source (counts are always over all products)
  const countByKey = (key: keyof Product, value: string) =>
    products.filter((p) => p[key] === value).length

  const categories: FacetOption[] = [
    { value: 'all', label: 'All Products', count: products.length },
    { value: 'women', label: 'Women', count: countByKey('category', 'women') },
    { value: 'men', label: 'Men', count: countByKey('category', 'men') },
  ]

  // Subcategories scoped to active category
  const subSource =
    params.category && params.category !== 'all'
      ? products.filter((p) => p.category === params.category)
      : products
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
  const allSizeSet = new Set(products.flatMap((p) => p.sizes ?? []))
  const allSizesSorted = sortSizes([...allSizeSet])
  const clothingSizes = allSizesSorted.filter((s) => classifySize(s) === 'clothing')
  const waistSizes = allSizesSorted.filter((s) => classifySize(s) === 'waist')

  // Colors — deduplicated by name, sorted by frequency
  const colorMap = new Map<string, string>() // name → hex (first occurrence wins)
  products.forEach((p) =>
    p.colors?.forEach((c) => {
      if (!colorMap.has(c.name)) colorMap.set(c.name, c.hex)
    })
  )
  const colors: ColorFacetOption[] = [...colorMap.entries()]
    .map(([name, hex]) => ({
      name,
      hex,
      count: products.filter((p) => p.colors?.some((c) => c.name === name)).length,
    }))
    .sort((a, b) => b.count - a.count)

  // Price range (over all products)
  const prices = products.map((p) => p.price)
  const priceRange = { min: Math.min(...prices), max: Math.max(...prices) }

  return {
    products: result,
    total: result.length,
    facets: { categories, subcategories, badges, clothingSizes, waistSizes, colors, priceRange },
  }
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
