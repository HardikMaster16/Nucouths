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
  /** Named seasonal/thematic collection (e.g. 'Autumn / Winter 2025',
   *  'Resort Edit') — already authored per-product in
   *  lib/product-detail-data.ts; also present here so the catalog-level
   *  listing/filtering (lib/product-filters.ts) can use it directly. */
  collection?: string
  price: number
  compareAtPrice?: number       // original price when on sale
  currency: string
  images: [ProductImage, ...ProductImage[]] // at least 1
  hoverImage?: ProductImage     // shown on card hover
  colors?: ProductColor[]
  badge?: ProductBadge
  /** Homepage "New In" section membership (Product.newIn, prisma/schema.prisma)
   *  — admin-set, independent of `badge`. */
  newIn?: boolean
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
  /** Stock at the time this line was last read/added — for a signed-in
   *  customer this is always the live ProductVariant.stock (lib/cart.db.ts
   *  re-reads it from Prisma on every cart load); for a guest it's a
   *  point-in-time snapshot from when the item was added. Display-only
   *  (drives the quantity selector's cap) — never authoritative for
   *  checkout, which always re-reads stock from Prisma regardless.
   *  Optional: undefined for a historical order-item reconstruction
   *  (lib/orders.actions.ts) or a pre-existing localStorage guest cart line
   *  persisted before this field existed — both degrade to "no further
   *  increase" rather than a hard error (see CartClient.tsx's
   *  getMaxQuantity). */
  stock?: number
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cod'

export type OrderStatus =
  | 'Processing'
  | 'Confirmed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'

/** Matches prisma/schema.prisma's OrderPaymentStatus enum exactly — unlike
 *  OrderStatus, none of these values need @map translation (no spaces), so
 *  there's no separate TO/FROM mapping table for this one. Deliberately
 *  independent of OrderStatus (fulfillment) — see Order.paymentStatus's own
 *  schema docstring for why an order can be Confirmed while payment is
 *  still Pending. */
export type OrderPaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded'

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

// ─── Saved Addresses ─────────────────────────────────────────────────────────
// Extends ShippingAddress (rather than a parallel field-naming scheme) so a
// saved Address is already shaped exactly like what checkout needs — no
// mapping required once checkout gains saved-address selection.

export type AddressLabel = 'Home' | 'Work' | 'Other'

export interface Address extends ShippingAddress {
  id: string
  /** Owning customer's id — always stamped from the authenticated session,
   *  never trusted from client input. See lib/address-context.tsx. */
  userId: string
  label: AddressLabel
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ─── Common UI ───────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type BadgeVariant = 'new' | 'sale' | 'sold-out' | 'limited'
