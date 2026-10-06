import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ProductGrid } from '@/components/products/ProductGrid'
import { HeroBanner } from '@/components/home/HeroBanner'
import { categoryBanners, socialPosts } from '@/lib/mock-data'
import { getVisibleBannersFromDb } from '@/lib/banners.db'
import { getCatalogProducts, getNewInProducts } from '@/lib/products.db'
import type { SocialPost } from '@/lib/types'

// ─── Page Metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Nucouths — Premium Fashion',
  description:
    'Discover the new Autumn collection at Nucouths. Shop premium clothing for men and women — contemporary style meets thoughtful craftsmanship.',
}

// Read live from Prisma on every request — same convention as
// app/products/page.tsx and app/products/[slug]/page.tsx: catalog changes
// (a new product, a badge edit) must show up immediately, not just after
// the next build/redeploy.
export const dynamic = 'force-dynamic'

// ─── Trust / Feature Strip ────────────────────────────────────────────────────

const TRUST_FEATURES = [
  {
    key: 'shipping',
    title: 'Free Shipping',
    desc: 'On orders above ₹2,999',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
        <rect x="9" y="11" width="14" height="10" rx="2" />
        <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      </svg>
    ),
  },
  {
    key: 'returns',
    title: '30-Day Returns',
    desc: 'Hassle-free exchanges',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    ),
  },
  {
    key: 'secure',
    title: 'Secure Payments',
    desc: 'SSL encrypted checkout',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    key: 'concierge',
    title: 'Style Concierge',
    desc: 'Expert styling advice',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    ),
  },
] as const

function FeatureStrip() {
  return (
    <section aria-label="Shopping benefits" className="border-y border-border bg-surface">
      <Container className="py-8 sm:py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 sm:gap-6 lg:gap-8">
          {TRUST_FEATURES.map((f) => (
            <div
              key={f.key}
              className="flex items-center gap-3 sm:gap-4"
            >
              <span className="shrink-0 w-10 h-10 flex items-center justify-center border border-border text-accent bg-white rounded-sm">
                {f.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-sans font-semibold text-text-primary leading-snug">{f.title}</p>
                <p className="text-xs font-sans text-text-secondary leading-snug mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

// ─── Category Banners ─────────────────────────────────────────────────────────

function CategoryBannersSection() {
  return (
    <section aria-label="Shop by category" className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          title="Shop the Edit"
          subtitle="Curated collections for every occasion"
          align="center"
          className="mb-10"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5">
          {categoryBanners.map((banner) => (
            <Link
              key={banner.id}
              href={banner.href}
              className="group relative overflow-hidden bg-surface block aspect-[3/4] sm:aspect-[2/3]"
              aria-label={`Shop ${banner.label} collection`}
            >
              <Image
                src={banner.image.src}
                alt={banner.image.alt}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-[1.04]"
              />
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <p className="font-display text-2xl sm:text-3xl text-white mb-1.5">{banner.label}</p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium tracking-[0.12em] uppercase text-white/65 group-hover:text-accent transition-colors duration-250">
                  {banner.cta}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-250 group-hover:translate-x-1">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}

// ─── Editorial Split Banner ───────────────────────────────────────────────────

function EditorialBanner() {
  return (
    <section aria-label="The Essentials Edit — editorial" className="py-16 sm:py-20">
      <Container>
        {/* On mobile: stacked. On lg: side-by-side. */}
        <div className="flex flex-col lg:flex-row overflow-hidden">
          {/* Image — 3:4 on mobile, fixed height on lg */}
          <div className="relative w-full lg:w-1/2 aspect-[4/3] lg:aspect-auto lg:min-h-[500px]">
            <Image
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000&q=80"
              alt="Nucouths Essentials Edit — model in minimalist fashion wardrobe"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-top"
            />
          </div>

          {/* Content */}
          <div className="w-full lg:w-1/2 bg-[#111111] flex flex-col justify-center px-7 py-10 sm:px-12 lg:px-16 xl:px-20">
            <p className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-accent mb-4">The Edit</p>
            <h2 className="font-display text-3xl sm:text-4xl text-white leading-tight mb-5">
              Built to Last,<br />
              <em className="not-italic text-accent">Worn to Love</em>
            </h2>
            <p className="text-[14px] sm:text-[15px] font-sans text-white/55 leading-relaxed mb-9 max-w-xs">
              Our Essentials collection is built around longevity. Timeless silhouettes,
              superior fabrics, and the kind of quality that only gets better over time.
            </p>
            <Link
              href="/collections/essentials"
              className="group inline-flex items-center gap-2 text-[11px] font-sans font-semibold tracking-[0.15em] uppercase text-white hover:text-accent transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              Explore Essentials
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-accent transition-transform duration-250 group-hover:translate-x-1">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}

// ─── Instagram / Community Grid ───────────────────────────────────────────────

function SocialGrid({ posts }: { posts: SocialPost[] }) {
  return (
    <section aria-label="Follow @Nucouths on Instagram" className="py-16 sm:py-20 border-t border-border">
      <Container>
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-text-secondary mb-2">Community</p>
          <h2 className="font-display text-3xl text-text-primary">@Nucouths</h2>
          <p className="text-sm font-sans text-text-secondary mt-2">
            Tag us to be featured
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {posts.map((post, i) => (
            <a
              key={post.id}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View Nucouths Instagram post — ${post.alt}`}
              className="group relative overflow-hidden bg-surface block aspect-square"
            >
              <Image
                src={post.src}
                alt={post.alt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.08]"
                priority={i < 3}
              />
              {/* Instagram hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center" aria-hidden="true">
                <svg
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-sm"
                  width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </section>
  )
}

// ─── Home Page ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Real database catalog — one query (lib/products.db.ts's
  // getCatalogProducts, which itself reuses lib/admin/products.db.ts's
  // productWithRelations include: images + variants + category +
  // collection, no N+1), ordered by createdAt asc to match seed order —
  // the same "featured/source order" the PLP already relies on.
  const catalog = await getCatalogProducts()

  // New In — Product.newIn rows only (lib/products.db.ts's
  // getNewInProducts), newest first, admin-toggled per product
  // (Admin → Products). No fallback padding: exactly what's flagged, or
  // nothing.
  const newIn = await getNewInProducts(4)

  // "Best Sellers" is still the badge-based rule the former mock catalog
  // used — Product.badge is a real, seeded column (prisma/schema.prisma),
  // not invented here. Falls back to the general catalog when the
  // badge-filtered list is too small to fill the section.
  const bestSellerCandidates = catalog.filter((p) => !p.badge || p.badge === 'SALE')
  const sellers = bestSellerCandidates.length >= 4 ? bestSellerCandidates.slice(0, 4) : catalog.slice(4, 8)

  // Real database banner — the exact same Banner row Admin → Banners
  // manages (lib/banners.db.ts's getVisibleBannersFromDb), read fresh on
  // every request since this page is `dynamic = 'force-dynamic'` above.
  const heroBanner = (await getVisibleBannersFromDb('hero'))[0]

  return (
    <main id="main-content">
      {/* 1. Hero */}
      <HeroBanner banner={heroBanner} />

      {/* 2. Trust strip */}
      <FeatureStrip />

      {/* 3. New In — omitted entirely if the catalog has nothing to show
             yet (an empty database), rather than rendering ProductGrid's
             loading-skeleton state permanently or falling back to mock
             data. */}
      {newIn.length > 0 && (
        <section aria-label="New In — latest arrivals" className="py-16 sm:py-20">
          <Container>
            <SectionHeading
              title="New In"
              subtitle="Fresh arrivals, just in."
              viewAllHref="/collections/new-in"
              viewAllLabel="View All New In"
            />
            <ProductGrid products={newIn} columns={4} priorityCount={4} />
          </Container>
        </section>
      )}

      {/* 4. Category banners */}
      <CategoryBannersSection />

      {/* 5. Editorial split */}
      <EditorialBanner />

      {/* 6. Best Sellers — same empty-catalog handling as New In above. */}
      {sellers.length > 0 && (
        <section aria-label="Best Sellers" className="py-16 sm:py-20 bg-surface">
          <Container>
            <SectionHeading
              title="Best Sellers"
              subtitle="Our most-loved pieces, season after season"
              viewAllHref="/collections/all"
              viewAllLabel="Shop All"
            />
            <ProductGrid products={sellers} columns={4} />
          </Container>
        </section>
      )}

      {/* 7. Instagram / community */}
      <SocialGrid posts={socialPosts} />
    </main>
  )
}
