// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Mock Data
// Replace with API/CMS calls when backend is ready.
// All strings are configuration-driven — no hardcoding inside components.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AnnouncementMessage,
  CategoryBanner,
  FooterSection,
  NavItem,
  Product,
  SocialLink,
  SocialPost,
} from './types'

// ─── Announcement Bar ────────────────────────────────────────────────────────

export const announcementMessages: AnnouncementMessage[] = [
  {
    id: 'ann-1',
    text: 'Free shipping on orders above ₹2,999',
    linkLabel: 'Shop Now',
    linkHref: '/collections/all',
  },
  {
    id: 'ann-2',
    text: 'New Autumn Collection — available now',
    linkLabel: 'Explore',
    linkHref: '/collections/new-in',
  },
  {
    id: 'ann-3',
    text: 'Easy 30-day returns · No questions asked',
  },
]

// ─── Navigation ──────────────────────────────────────────────────────────────

export const navItems: NavItem[] = [
  {
    // Gender is a Product.category, not a named collection (see
    // lib/product-filters.ts) — so these reuse the existing /products
    // route + query params rather than a competing /collections/men route.
    label: 'Men',
    href: '/products?category=men',
    children: [
      { label: 'Tops & T-Shirts', href: '/products?category=men&subcategory=tops' },
      { label: 'Trousers & Joggers', href: '/products?category=men&subcategory=trousers' },
      { label: 'Outerwear', href: '/products?category=men&subcategory=outerwear' },
      { label: 'Accessories', href: '/products?category=men&subcategory=accessories' },
    ],
  },
  {
    label: 'Women',
    href: '/products?category=women',
    children: [
      { label: 'Dresses & Skirts', href: '/products?category=women&subcategory=dresses' },
      { label: 'Tops & Blouses', href: '/products?category=women&subcategory=tops' },
      { label: 'Trousers & Jeans', href: '/products?category=women&subcategory=trousers' },
      { label: 'Outerwear', href: '/products?category=women&subcategory=outerwear' },
      { label: 'Accessories', href: '/products?category=women&subcategory=accessories' },
    ],
  },
  {
    label: 'Collections',
    href: '/collections',
    children: [
      { label: 'Autumn / Winter 2025', href: '/collections/aw25' },
      { label: 'Resort Edit', href: '/collections/resort' },
      { label: 'Essentials', href: '/collections/essentials' },
    ],
  },
  {
    label: 'New In',
    href: '/collections/new-in',
  },
]

// ─── Products ────────────────────────────────────────────────────────────────

export const products: Product[] = [
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
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Camel', hex: '#C19A6B' },
      { name: 'Charcoal', hex: '#36454F' },
      { name: 'Ivory', hex: '#E8E8D8' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80',
        alt: 'Structured Wool Blazer — front view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1615125990475-b318176a49cc?w=800&q=80',
      alt: 'Structured Wool Blazer — side view',
    },
    tags: ['blazer', 'wool', 'formal', 'autumn'],
  },
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
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Sand', hex: '#C2B280' },
      { name: 'White', hex: '#F5F5F0' },
      { name: 'Black', hex: '#111111' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
        alt: 'Linen Wide-Leg Trousers — front view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
      alt: 'Linen Wide-Leg Trousers — worn view',
    },
    tags: ['linen', 'trousers', 'wide-leg', 'summer'],
  },
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Oatmeal', hex: '#E8DCC8' },
      { name: 'Navy', hex: '#1B2A4A' },
      { name: 'Forest', hex: '#2D4A3E' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1610901157620-340856d0a50f?w=800&q=80',
        alt: 'Merino Ribbed Turtleneck — front view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1642886512785-b5fee9faad7f?w=800&q=80',
      alt: 'Merino Ribbed Turtleneck — styled view',
    },
    tags: ['merino', 'knitwear', 'turtleneck', 'autumn'],
  },
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
    sizes: ['28', '30', '32', '34', '36'],
    colors: [
      { name: 'Slate', hex: '#708090' },
      { name: 'Sand', hex: '#C2B280' },
      { name: 'Black', hex: '#111111' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1543132220-7bc04a0e790a?w=800&q=80',
        alt: 'Tailored Straight Trousers — front view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
      alt: 'Tailored Straight Trousers — styled view',
    },
    tags: ['trousers', 'tailored', 'smart-casual'],
  },
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
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'White', hex: '#F5F5F0' },
      { name: 'Light Blue', hex: '#B0C8D8' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1644483878395-858cd642538e?w=800&q=80',
        alt: 'Oversized Cotton Shirt — front view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800&q=80',
      alt: 'Oversized Cotton Shirt — worn view',
    },
    tags: ['shirt', 'cotton', 'oversized', 'casual'],
  },
  {
    id: 'p-006',
    name: 'Cashmere Blend Scarf',
    slug: 'cashmere-blend-scarf',
    category: 'women',
    subcategory: 'accessories',
    collection: 'Autumn / Winter 2025',
    price: 3499,
    currency: 'INR',
    inStock: true,
    colors: [
      { name: 'Caramel', hex: '#C68642' },
      { name: 'Grey', hex: '#9E9E9E' },
      { name: 'Burgundy', hex: '#800020' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1609803384069-19f3e5a70e75?w=800&q=80',
        alt: 'Cashmere Blend Scarf',
      },
    ],
    tags: ['scarf', 'cashmere', 'accessories', 'winter'],
  },
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Olive', hex: '#6B7C4F' },
      { name: 'Navy', hex: '#1B2A4A' },
      { name: 'Rust', hex: '#B7410E' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=800&q=80',
        alt: 'Quilted Overshirt Jacket — front view',
      },
    ],
    hoverImage: {
      src: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80',
      alt: 'Quilted Overshirt Jacket — back view',
    },
    tags: ['jacket', 'quilted', 'outerwear', 'autumn'],
  },
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
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Champagne', hex: '#C8A97E' },
      { name: 'Noir', hex: '#111111' },
    ],
    images: [
      {
        src: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
        alt: 'Slip Midi Dress — front view',
      },
    ],
    tags: ['dress', 'midi', 'slip', 'evening'],
  },
]

// ─── New In (NEW + LIMITED badge products) ────────────────────────────────────

export const newInProducts: Product[] = products.filter(
  (p) => p.badge === 'NEW' || p.badge === 'LIMITED'
)

// ─── Best Sellers (no badge or SALE badge) ────────────────────────────────────

export const bestSellers: Product[] = products.filter(
  (p) => !p.badge || p.badge === 'SALE'
)

// ─── Category Banners ────────────────────────────────────────────────────────

export const categoryBanners: CategoryBanner[] = [
  {
    id: 'cat-men',
    label: 'Men',
    href: '/products?category=men',
    cta: 'Shop Men',
    image: {
      src: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=900&q=80',
      alt: "Men's collection — tailored contemporary fashion",
    },
  },
  {
    id: 'cat-women',
    label: 'Women',
    href: '/products?category=women',
    cta: 'Shop Women',
    image: {
      src: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=900&q=80',
      alt: "Women's collection — refined modern wardrobe",
    },
  },
  {
    id: 'cat-collections',
    label: 'Collections',
    href: '/collections',
    cta: 'Explore',
    image: {
      src: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=900&q=80',
      alt: 'Nucouths seasonal collections — curated editorial fashion',
    },
  },
]

// ─── Instagram / Social Posts ─────────────────────────────────────────────────

export const socialPosts: SocialPost[] = [
  {
    id: 'ig-1',
    src: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=500&q=80',
    alt: 'Model wearing Nucouths oversized blazer in neutral tones',
    href: 'https://instagram.com/nucouths',
  },
  {
    id: 'ig-2',
    src: 'https://images.unsplash.com/photo-1529139574466-a303027330d3?w=500&q=80',
    alt: 'Close-up of textured knitwear from Nucouths autumn edit',
    href: 'https://instagram.com/nucouths',
  },
  {
    id: 'ig-3',
    src: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500&q=80',
    alt: 'Nucouths editorial — wide leg trousers and structured top',
    href: 'https://instagram.com/nucouths',
  },
  {
    id: 'ig-4',
    src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&q=80',
    alt: 'Fluid linen trousers styled for summer from Nucouths',
    href: 'https://instagram.com/nucouths',
  },
  {
    id: 'ig-5',
    src: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=500&q=80',
    alt: 'Nucouths community look — minimalist fashion street style',
    href: 'https://instagram.com/nucouths',
  },
  {
    id: 'ig-6',
    src: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=500&q=80',
    alt: 'Nucouths women collection campaign shot in natural light',
    href: 'https://instagram.com/nucouths',
  },
]

// ─── Footer ──────────────────────────────────────────────────────────────────

export const footerSections: FooterSection[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'Men', href: '/collections/men' },
      { label: 'Women', href: '/collections/women' },
      { label: 'Collections', href: '/collections' },
      { label: 'New In', href: '/collections/new-in' },
      { label: 'Sale', href: '/collections/sale' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'Size Guide', href: '/size-guide' },
      { label: 'Shipping Policy', href: '/shipping' },
      { label: 'Returns & Refunds', href: '/returns' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Nucouths', href: '/about' },
      { label: 'Sustainability', href: '/sustainability' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
    ],
  },
]

export const socialLinks: SocialLink[] = [
  { platform: 'Instagram', href: 'https://instagram.com/nucouths', icon: 'instagram' },
  { platform: 'Pinterest', href: 'https://pinterest.com/nucouths', icon: 'pinterest' },
  { platform: 'TikTok', href: 'https://tiktok.com/@nucouths', icon: 'tiktok' },
]
