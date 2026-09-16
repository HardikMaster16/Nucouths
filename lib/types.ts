// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Global Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavLink {
  label: string
  href: string
}

export interface NavItem extends NavLink {
  children?: NavLink[]
}

// ─── Announcement Bar ────────────────────────────────────────────────────────

export interface AnnouncementMessage {
  id: string
  text: string
  linkLabel?: string
  linkHref?: string
}

// ─── Product ─────────────────────────────────────────────────────────────────

export type ProductBadge = 'NEW' | 'SALE' | 'SOLD OUT' | 'LIMITED'

export interface ProductColor {
  name: string
  hex: string
}

export interface ProductImage {
  src: string
  alt: string
}

export interface Product {
  id: string
  name: string
  brand?: string
  slug: string
  category: string
  subcategory?: string
  price: number
  compareAtPrice?: number       // original price when on sale
  currency: string
  images: [ProductImage, ...ProductImage[]] // at least 1
  hoverImage?: ProductImage     // shown on card hover
  colors?: ProductColor[]
  badge?: ProductBadge
  isWishlisted?: boolean
  inStock: boolean
  sizes?: string[]
  description?: string
  tags?: string[]
}

// ─── Product Variants ─────────────────────────────────────────────────────────
// Each variant = a unique (colour × size) combination that can be purchased.
// Designed so mock data can later be replaced by an API without rewriting UI.

export type StockState = 'in-stock' | 'low-stock' | 'out-of-stock' | 'sold-out'

export interface ProductVariant {
  id: string
  sku: string
  color: string        // colour name — matches ProductColor.name
  colorHex: string     // hex code — matches ProductColor.hex
  size: string         // 'S' | 'M' | '30' | 'ONE_SIZE' etc.
  stock: number        // 0 = sold out, 1–3 = low stock, 4+ = in stock
  /** Optional per-variant price override (e.g., limited edition surcharge) */
  priceOverride?: number
}

// ─── Product Detail ───────────────────────────────────────────────────────────
// Extends Product with rich content and variant data for the PDP.

export interface ProductDetail extends Product {
  variants: ProductVariant[]
  shortDescription: string      // 1–2 sentences below the title
  details: string[]             // bullet points for Details & Materials
  materials: string[]           // e.g. ['80% Merino Wool', '20% Nylon']
  care: string[]                // wash instructions
  shipping: string              // shipping policy copy
  returns: string               // returns policy copy
  collection?: string           // e.g. 'Autumn / Winter 2025'
}


// ─── Category Banner ─────────────────────────────────────────────────────────

export interface CategoryBanner {
  id: string
  label: string
  href: string
  image: ProductImage
  cta: string
}

// ─── Footer ──────────────────────────────────────────────────────────────────

export interface FooterLink {
  label: string
  href: string
  external?: boolean
}

export interface FooterSection {
  heading: string
  links: FooterLink[]
}

export interface SocialLink {
  platform: string
  href: string
  icon: 'instagram' | 'pinterest' | 'tiktok' | 'facebook' | 'youtube'
}

export interface SocialPost {
  id: string
  src: string
  alt: string
  href: string
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  variantId: string
  slug: string
  name: string
  category: string
  color: string
  size: string
  quantity: number
  price: number
  compareAtPrice?: number
  currency: string
  image: ProductImage
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cod'

export interface ContactInfo {
  email: string
  phone: string
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  address: string
  apartment?: string
  city: string
  state: string
  pinCode: string
  country: string
  phone: string
}

// ─── Common UI ───────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type BadgeVariant = 'new' | 'sale' | 'sold-out' | 'limited'
