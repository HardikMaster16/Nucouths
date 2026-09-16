// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Product Detail Mock Data
//
// IMAGES POLICY:
//   Every image URL here is sourced directly from the matching entry in
//   mock-data.ts (primary image + hoverImage where it exists). This guarantees
//   no broken or unrelated images appear in the gallery.
//   When real product photography is available, swap URLs here — no component
//   changes required.
//
// VARIANTS:
//   Each variant = a unique (colour × size) combination.
//   Swap getProductDetail for an async API call when the backend is ready.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductDetail, ProductVariant } from './types'

// ─── Common copy ─────────────────────────────────────────────────────────────

const STANDARD_SHIPPING =
  'Free standard shipping on orders above ₹2,999. Express delivery available at checkout. ' +
  'Estimated delivery: 3–5 business days for standard, 1–2 business days for express.'

const STANDARD_RETURNS =
  'Free returns within 30 days of delivery. Items must be unworn, unwashed, and have all ' +
  'original tags attached. Final-sale items are not eligible for return.'

// ─── Variant builder ──────────────────────────────────────────────────────────

function mkVariants(
  productId: string,
  matrix: Array<{
    color: string
    colorHex: string
    sizes: Array<{ size: string; stock: number }>
  }>
): ProductVariant[] {
  const variants: ProductVariant[] = []
  matrix.forEach(({ color, colorHex, sizes }) => {
    sizes.forEach(({ size, stock }) => {
      const cSlug = color.toLowerCase().replace(/\s+/g, '-')
      const sSlug = size.toLowerCase().replace(/\s+/g, '-')
      variants.push({
        id: `${productId}-${cSlug}-${sSlug}`,
        sku: `NCT-${productId.toUpperCase()}-${cSlug.toUpperCase()}-${sSlug.toUpperCase()}`,
        color,
        colorHex,
        size,
        stock,
      })
    })
  })
  return variants
}

// ─── Product Detail Data ──────────────────────────────────────────────────────
// Images: only URLs already verified in mock-data.ts (primary + hoverImage).

export const productDetails: ProductDetail[] = [
  // ── p-001 · Structured Wool Blazer ────────────────────────────────────────
  {
    id: 'p-001',
    name: 'Structured Wool Blazer',
    slug: 'structured-wool-blazer',
    category: 'women',
    subcategory: 'outerwear',
    collection: 'Autumn / Winter 2025',
    price: 12999,
    currency: 'INR',
    badge: 'NEW',
    inStock: true,
    shortDescription:
      'A refined single-breasted blazer cut in a mid-weight Italian wool blend. Tailored through the shoulders with a relaxed long-line hem.',
    description:
      'Crafted from a mid-weight Italian wool blend, this structured blazer strikes the balance between sharp tailoring and everyday ease. The single-breasted silhouette features a notched lapel, welt chest pocket, and flap hip pockets. A half-canvas construction ensures the chest holds its shape wash after wash.',
    details: [
      'Single-breasted, notched lapel',
      'Half-canvas construction',
      'Welt chest pocket and flap hip pockets',
      'Fully lined in cupro',
      'Long-line hem: 80 cm from shoulder seam',
    ],
    materials: ['70% Virgin Wool', '20% Polyamide', '10% Cashmere', 'Lining: 100% Cupro'],
    care: [
      'Dry clean only',
      'Do not bleach',
      'Do not tumble dry',
      'Store on a wide-shouldered hanger',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['blazer', 'wool', 'formal', 'autumn'],
    colors: [
      { name: 'Camel', hex: '#C19A6B' },
      { name: 'Charcoal', hex: '#36454F' },
      { name: 'Ivory', hex: '#E8E8D8' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&q=85',
        alt: 'Structured Wool Blazer — front view',
      },
    ],
    variants: mkVariants('p-001', [
      {
        color: 'Camel', colorHex: '#C19A6B',
        sizes: [
          { size: 'XS', stock: 8 }, { size: 'S', stock: 12 },
          { size: 'M', stock: 6 }, { size: 'L', stock: 3 },
          { size: 'XL', stock: 0 },
        ],
      },
      {
        color: 'Charcoal', colorHex: '#36454F',
        sizes: [
          { size: 'XS', stock: 0 }, { size: 'S', stock: 5 },
          { size: 'M', stock: 10 }, { size: 'L', stock: 7 },
          { size: 'XL', stock: 4 },
        ],
      },
      {
        color: 'Ivory', colorHex: '#E8E8D8',
        sizes: [
          { size: 'XS', stock: 2 }, { size: 'S', stock: 1 },
          { size: 'M', stock: 0 }, { size: 'L', stock: 0 },
          { size: 'XL', stock: 0 },
        ],
      },
    ]),
    isWishlisted: false,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },

  // ── p-002 · Linen Wide-Leg Trousers ───────────────────────────────────────
  {
    id: 'p-002',
    name: 'Linen Wide-Leg Trousers',
    slug: 'linen-wide-leg-trousers',
    category: 'women',
    subcategory: 'trousers',
    collection: 'Resort Edit',
    price: 4499,
    compareAtPrice: 5999,
    currency: 'INR',
    badge: 'SALE',
    inStock: true,
    shortDescription:
      'Fluid wide-leg trousers in breathable Belgian linen. An effortless warm-weather essential with a relaxed high-rise waist.',
    description:
      'Cut from 100% Belgian linen in a relaxed wide-leg silhouette, these trousers move beautifully in warm weather. The high-rise waist features a concealed zip with hook-and-bar closure, side seam pockets, and a clean front pleat. Versatile enough to style with a simple tank or a tailored shirt.',
    details: [
      'High-rise, wide-leg silhouette',
      'Concealed zip with hook-and-bar waist closure',
      'Side seam pockets',
      'Clean front pleat',
      'Hem length: 112 cm (based on a UK 10)',
    ],
    materials: ['100% Belgian Linen'],
    care: [
      'Machine wash cold, gentle cycle',
      'Lay flat to dry',
      'Cool iron while slightly damp',
      'Do not bleach',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['linen', 'trousers', 'wide-leg', 'summer'],
    colors: [
      { name: 'Sand', hex: '#C2B280' },
      { name: 'White', hex: '#F5F5F0' },
      { name: 'Black', hex: '#111111' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&q=85',
        alt: 'Linen Wide-Leg Trousers — front view',
      },
    ],
    variants: mkVariants('p-002', [
      {
        color: 'Sand', colorHex: '#C2B280',
        sizes: [
          { size: 'XS', stock: 5 }, { size: 'S', stock: 8 },
          { size: 'M', stock: 10 }, { size: 'L', stock: 2 },
        ],
      },
      {
        color: 'White', colorHex: '#F5F5F0',
        sizes: [
          { size: 'XS', stock: 3 }, { size: 'S', stock: 0 },
          { size: 'M', stock: 4 }, { size: 'L', stock: 7 },
        ],
      },
      {
        color: 'Black', colorHex: '#111111',
        sizes: [
          { size: 'XS', stock: 0 }, { size: 'S', stock: 0 },
          { size: 'M', stock: 0 }, { size: 'L', stock: 0 },
        ],
      },
    ]),
    isWishlisted: false,
    sizes: ['XS', 'S', 'M', 'L'],
  },

  // ── p-003 · Merino Ribbed Turtleneck ──────────────────────────────────────
  {
    id: 'p-003',
    name: 'Merino Ribbed Turtleneck',
    slug: 'merino-ribbed-turtleneck',
    category: 'men',
    subcategory: 'tops',
    collection: 'Autumn / Winter 2025',
    price: 3999,
    currency: 'INR',
    badge: 'NEW',
    inStock: true,
    shortDescription:
      'A finely-ribbed turtleneck knitted from extra-fine Merino wool. Naturally temperature-regulating and exceptionally soft against the skin.',
    description:
      'Knitted from extra-fine Merino wool in a classic ribbed construction, this turtleneck is a wardrobe cornerstone. The fold-over neck sits naturally without stiffness, and the slim fit through the body is designed to layer cleanly under outerwear. Machine washable at 30°C for everyday ease.',
    details: [
      'Slim fit through body and arm',
      'Fine-rib construction',
      'Fold-over turtleneck collar',
      'Ribbed cuffs and hem',
      'Body length: 70 cm (size M)',
    ],
    materials: ['100% Extra-Fine Merino Wool (17.5 micron)'],
    care: [
      'Machine wash at 30°C, wool programme',
      'Reshape while damp and dry flat',
      'Do not tumble dry',
      'Warm iron on reverse',
      'Store folded, not hung',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['merino', 'knitwear', 'turtleneck', 'autumn'],
    colors: [
      { name: 'Oatmeal', hex: '#E8DCC8' },
      { name: 'Navy', hex: '#1B2A4A' },
      { name: 'Forest', hex: '#2D4A3E' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=1200&q=85',
        alt: 'Merino Ribbed Turtleneck — front view',
      },
    ],
    variants: mkVariants('p-003', [
      {
        color: 'Oatmeal', colorHex: '#E8DCC8',
        sizes: [
          { size: 'S', stock: 6 }, { size: 'M', stock: 9 },
          { size: 'L', stock: 4 }, { size: 'XL', stock: 2 },
          { size: 'XXL', stock: 1 },
        ],
      },
      {
        color: 'Navy', colorHex: '#1B2A4A',
        sizes: [
          { size: 'S', stock: 10 }, { size: 'M', stock: 12 },
          { size: 'L', stock: 8 }, { size: 'XL', stock: 5 },
          { size: 'XXL', stock: 3 },
        ],
      },
      {
        color: 'Forest', colorHex: '#2D4A3E',
        sizes: [
          { size: 'S', stock: 0 }, { size: 'M', stock: 2 },
          { size: 'L', stock: 1 }, { size: 'XL', stock: 0 },
          { size: 'XXL', stock: 0 },
        ],
      },
    ]),
    isWishlisted: false,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },

  // ── p-004 · Tailored Straight Trousers (waist sizes) ──────────────────────
  {
    id: 'p-004',
    name: 'Tailored Straight Trousers',
    slug: 'tailored-straight-trousers',
    category: 'men',
    subcategory: 'trousers',
    collection: 'Essentials',
    price: 5499,
    currency: 'INR',
    inStock: true,
    shortDescription:
      'A clean straight-leg trouser in a durable cotton-twill blend. Sharp enough for the office, relaxed enough for weekends.',
    description:
      'Precision-cut in a medium-weight cotton-twill blend, these straight-leg trousers offer versatile styling across occasions. The classic flat-front waist sits slightly below the natural waist, and the straight leg falls cleanly over the shoe. Internal adjusters offer a half-size fit range.',
    details: [
      'Straight-leg, slightly below-natural-waist rise',
      'Flat front waist with internal adjusters',
      'Side seam and rear welt pockets',
      'Button-zip fly',
      'Inseam: 81 cm (size 32)',
    ],
    materials: ['65% Cotton', '33% Polyester', '2% Elastane'],
    care: [
      'Machine wash at 40°C',
      'Tumble dry on low heat',
      'Iron on medium heat',
      'Do not bleach',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['trousers', 'tailored', 'smart-casual'],
    colors: [
      { name: 'Slate', hex: '#708090' },
      { name: 'Sand', hex: '#C2B280' },
      { name: 'Black', hex: '#111111' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=85',
        alt: 'Tailored Straight Trousers — front view',
      },
    ],
    variants: mkVariants('p-004', [
      {
        color: 'Slate', colorHex: '#708090',
        sizes: [
          { size: '28', stock: 4 }, { size: '30', stock: 8 },
          { size: '32', stock: 11 }, { size: '34', stock: 6 },
          { size: '36', stock: 2 },
        ],
      },
      {
        color: 'Sand', colorHex: '#C2B280',
        sizes: [
          { size: '28', stock: 2 }, { size: '30', stock: 5 },
          { size: '32', stock: 7 }, { size: '34', stock: 3 },
          { size: '36', stock: 0 },
        ],
      },
      {
        color: 'Black', colorHex: '#111111',
        sizes: [
          { size: '28', stock: 0 }, { size: '30', stock: 0 },
          { size: '32', stock: 1 }, { size: '34', stock: 0 },
          { size: '36', stock: 0 },
        ],
      },
    ]),
    isWishlisted: false,
    sizes: ['28', '30', '32', '34', '36'],
  },

  // ── p-005 · Oversized Cotton Shirt ────────────────────────────────────────
  {
    id: 'p-005',
    name: 'Oversized Cotton Shirt',
    slug: 'oversized-cotton-shirt',
    category: 'women',
    subcategory: 'tops',
    collection: 'Essentials',
    price: 2999,
    currency: 'INR',
    badge: 'LIMITED',
    inStock: true,
    shortDescription:
      'A relaxed oversized shirt in a crisp 100% organic cotton poplin. Wears equally well tucked or untucked.',
    description:
      'Cut from a 100% organic cotton poplin in a deliberately generous silhouette, this shirt moves with ease throughout the day. The dropped shoulders, extended hem, and relaxed fit allow for multiple ways of wearing — tucked neatly into trousers or loosely over a slip dress. The curved hem and mother-of-pearl buttons add a considered finishing detail.',
    details: [
      'Oversized fit with dropped shoulder seam',
      'Curved hem, longer at back',
      'Mother-of-pearl buttons',
      'Breast pocket',
      'Length: 82 cm (size S, from shoulder seam)',
    ],
    materials: ['100% Organic Cotton Poplin (GOTS Certified)'],
    care: [
      'Machine wash at 40°C',
      'Tumble dry on low',
      'Medium-hot iron',
      'Do not bleach',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['shirt', 'cotton', 'oversized', 'casual'],
    colors: [
      { name: 'White', hex: '#F5F5F0' },
      { name: 'Light Blue', hex: '#B0C8D8' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=1200&q=85',
        alt: 'Oversized Cotton Shirt — front view',
      },
      {
        src: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1200&q=85',
        alt: 'Oversized Cotton Shirt — worn view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80',
      alt: 'Oversized Cotton Shirt — worn view',
    },
    variants: mkVariants('p-005', [
      {
        color: 'White', colorHex: '#F5F5F0',
        sizes: [
          { size: 'XS', stock: 2 }, { size: 'S', stock: 3 },
          { size: 'M', stock: 1 }, { size: 'L', stock: 0 },
        ],
      },
      {
        color: 'Light Blue', colorHex: '#B0C8D8',
        sizes: [
          { size: 'XS', stock: 0 }, { size: 'S', stock: 1 },
          { size: 'M', stock: 2 }, { size: 'L', stock: 0 },
        ],
      },
    ]),
    isWishlisted: false,
    sizes: ['XS', 'S', 'M', 'L'],
  },

  // ── p-006 · Cashmere Blend Scarf (fully sold out) ─────────────────────────
  {
    id: 'p-006',
    name: 'Cashmere Blend Scarf',
    slug: 'cashmere-blend-scarf',
    category: 'women',
    subcategory: 'accessories',
    collection: 'Autumn / Winter 2025',
    price: 3499,
    currency: 'INR',
    badge: 'SOLD OUT',
    inStock: false,
    shortDescription:
      'A generous wrap-style scarf in a buttery cashmere-wool blend. Fringed at both ends and finished with hand-rolled edges.',
    description:
      'Woven in Scotland from a cashmere-wool blend, this wrap scarf drapes effortlessly and provides exceptional warmth without weight. The classic herringbone weave is refined with three carefully edited colourways. Hand-rolled edges and hand-knotted fringe complete the artisanal finish.',
    details: [
      'Wrap style, 200 cm × 70 cm',
      'Hand-knotted fringe at both ends',
      'Hand-rolled edges',
      'Herringbone weave',
      'Woven in Scotland',
    ],
    materials: ['70% Cashmere', '30% Merino Wool'],
    care: [
      'Dry clean recommended',
      'Hand wash in cool water if needed',
      'Dry flat, reshape while damp',
      'Do not tumble dry',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['scarf', 'cashmere', 'accessories', 'winter'],
    colors: [
      { name: 'Caramel', hex: '#C68642' },
      { name: 'Grey', hex: '#9E9E9E' },
      { name: 'Burgundy', hex: '#800020' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1601924638867-3a6de6b7a500?w=1200&q=85',
        alt: 'Cashmere Blend Scarf — product view',
      },
    ],
    hoverImage: undefined,
    variants: [
      { id: 'p-006-caramel-os', sku: 'NCT-P006-CARAMEL-OS', color: 'Caramel', colorHex: '#C68642', size: 'ONE SIZE', stock: 0 },
      { id: 'p-006-grey-os', sku: 'NCT-P006-GREY-OS', color: 'Grey', colorHex: '#9E9E9E', size: 'ONE SIZE', stock: 0 },
      { id: 'p-006-burgundy-os', sku: 'NCT-P006-BURGUNDY-OS', color: 'Burgundy', colorHex: '#800020', size: 'ONE SIZE', stock: 0 },
    ],
    isWishlisted: false,
    sizes: [],
  },

  // ── p-007 · Quilted Overshirt Jacket ──────────────────────────────────────
  {
    id: 'p-007',
    name: 'Quilted Overshirt Jacket',
    slug: 'quilted-overshirt-jacket',
    category: 'men',
    subcategory: 'outerwear',
    collection: 'Autumn / Winter 2025',
    price: 7999,
    compareAtPrice: 9999,
    currency: 'INR',
    badge: 'SALE',
    inStock: true,
    shortDescription:
      'A lightweight quilted jacket styled as an overshirt. Wear it buttoned as outerwear or open as a layering piece.',
    description:
      'The Quilted Overshirt Jacket bridges the gap between a shirt and a coat. Its diamond-quilted outer shell traps warm air efficiently without adding bulk, and the spread collar and button placket give it a relaxed, wearable feel. Versatile enough to wear buttoned as a standalone outer layer or open as a relaxed mid-layer over a heavyweight knit.',
    details: [
      'Regular fit with spread collar',
      'Full button placket',
      'Chest and side welt pockets',
      'Diamond-quilted outer shell',
      'Lightly padded with recycled filling',
      'Body length: 76 cm (size M)',
    ],
    materials: ['Shell: 100% Recycled Polyester', 'Fill: 100% Recycled Polyester', 'Lining: 100% Polyester'],
    care: [
      'Machine wash at 30°C',
      'Tumble dry on low with clean tennis balls',
      'Do not iron filling directly',
      'Do not bleach',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['jacket', 'quilted', 'outerwear', 'autumn'],
    colors: [
      { name: 'Olive', hex: '#6B7C4F' },
      { name: 'Navy', hex: '#1B2A4A' },
      { name: 'Rust', hex: '#B7410E' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=1200&q=85',
        alt: 'Quilted Overshirt Jacket — front view',
      },
      {
        src: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=1200&q=85',
        alt: 'Quilted Overshirt Jacket — back view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80',
      alt: 'Quilted Overshirt Jacket — back view',
    },
    variants: mkVariants('p-007', [
      {
        color: 'Olive', colorHex: '#6B7C4F',
        sizes: [
          { size: 'S', stock: 5 }, { size: 'M', stock: 9 },
          { size: 'L', stock: 7 }, { size: 'XL', stock: 3 },
          { size: 'XXL', stock: 1 },
        ],
      },
      {
        color: 'Navy', colorHex: '#1B2A4A',
        sizes: [
          { size: 'S', stock: 3 }, { size: 'M', stock: 6 },
          { size: 'L', stock: 4 }, { size: 'XL', stock: 2 },
          { size: 'XXL', stock: 0 },
        ],
      },
      {
        color: 'Rust', colorHex: '#B7410E',
        sizes: [
          { size: 'S', stock: 2 }, { size: 'M', stock: 1 },
          { size: 'L', stock: 0 }, { size: 'XL', stock: 0 },
          { size: 'XXL', stock: 0 },
        ],
      },
    ]),
    isWishlisted: false,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },

  // ── p-008 · Slip Midi Dress (sold out) ────────────────────────────────────
  {
    id: 'p-008',
    name: 'Slip Midi Dress',
    slug: 'slip-midi-dress',
    category: 'women',
    subcategory: 'dresses',
    collection: 'Resort Edit',
    price: 6499,
    currency: 'INR',
    badge: 'SOLD OUT',
    inStock: false,
    shortDescription:
      'A bias-cut slip dress in a fluid satin-weave fabric. Effortlessly elegant, day or evening.',
    description:
      'Cut on the bias from a fluid satin-weave fabric, this slip dress skims the body and moves naturally with every step. The adjustable spaghetti straps, V-neckline, and midi length make it endlessly versatile — style it alone in warmer months or layer over a fitted long-sleeve in cooler weather. The delicate lace trim at the hem adds a refined finishing touch.',
    details: [
      'Bias cut for fluid drape',
      'Adjustable spaghetti straps',
      'V-neckline, front and back',
      'Lace trim at hem',
      'Midi length: 118 cm (based on a UK 10)',
    ],
    materials: ['95% Viscose', '5% Elastane'],
    care: [
      'Hand wash at 30°C or machine wash on delicate cycle',
      'Lay flat to dry',
      'Cool iron on reverse',
      'Do not tumble dry',
      'Do not bleach',
    ],
    shipping: STANDARD_SHIPPING,
    returns: STANDARD_RETURNS,
    tags: ['dress', 'midi', 'slip', 'evening'],
    colors: [
      { name: 'Champagne', hex: '#C8A97E' },
      { name: 'Noir', hex: '#111111' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&q=85',
        alt: 'Slip Midi Dress — front view',
      },
    ],
    hoverImage: undefined,
    variants: [
      { id: 'p-008-champagne-xs', sku: 'NCT-P008-CHAMPAGNE-XS', color: 'Champagne', colorHex: '#C8A97E', size: 'XS', stock: 0 },
      { id: 'p-008-champagne-s', sku: 'NCT-P008-CHAMPAGNE-S', color: 'Champagne', colorHex: '#C8A97E', size: 'S', stock: 0 },
      { id: 'p-008-champagne-m', sku: 'NCT-P008-CHAMPAGNE-M', color: 'Champagne', colorHex: '#C8A97E', size: 'M', stock: 0 },
      { id: 'p-008-champagne-l', sku: 'NCT-P008-CHAMPAGNE-L', color: 'Champagne', colorHex: '#C8A97E', size: 'L', stock: 0 },
      { id: 'p-008-noir-xs', sku: 'NCT-P008-NOIR-XS', color: 'Noir', colorHex: '#111111', size: 'XS', stock: 0 },
      { id: 'p-008-noir-s', sku: 'NCT-P008-NOIR-S', color: 'Noir', colorHex: '#111111', size: 'S', stock: 0 },
      { id: 'p-008-noir-m', sku: 'NCT-P008-NOIR-M', color: 'Noir', colorHex: '#111111', size: 'M', stock: 0 },
      { id: 'p-008-noir-l', sku: 'NCT-P008-NOIR-L', color: 'Noir', colorHex: '#111111', size: 'L', stock: 0 },
    ],
    isWishlisted: false,
    sizes: ['XS', 'S', 'M', 'L'],
  },
]

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/** Get a single product detail by slug. Returns undefined if not found. */
export function getProductDetail(slug: string): ProductDetail | undefined {
  return productDetails.find((p) => p.slug === slug)
}

/** All slugs — used for generateStaticParams. */
export function getAllProductSlugs(): string[] {
  return productDetails.map((p) => p.slug)
}

/** Derive stock state from a variant's stock count. */
export function variantStockState(stock: number): import('./types').StockState {
  if (stock <= 0) return 'sold-out'
  if (stock <= 3) return 'low-stock'
  return 'in-stock'
}

/** Get unique colours from a product's variants. */
export function getProductColors(
  variants: ProductVariant[]
): Array<{ name: string; hex: string }> {
  const seen = new Set<string>()
  const result: Array<{ name: string; hex: string }> = []
  for (const v of variants) {
    if (!seen.has(v.color)) {
      seen.add(v.color)
      result.push({ name: v.color, hex: v.colorHex })
    }
  }
  return result
}

/** Get all sizes listed for a colour (includes sold-out). */
export function getSizesForColor(variants: ProductVariant[], color: string): string[] {
  return variants.filter((v) => v.color === color).map((v) => v.size)
}

/** Find a specific variant by colour + size. */
export function findVariant(
  variants: ProductVariant[],
  color: string,
  size: string
): ProductVariant | undefined {
  return variants.find((v) => v.color === color && v.size === size)
}

/** Related products — same category, different product, max N. */
export function getRelatedProducts(current: ProductDetail, maxCount = 4): ProductDetail[] {
  return productDetails
    .filter((p) => p.id !== current.id && p.category === current.category)
    .slice(0, maxCount)
}
