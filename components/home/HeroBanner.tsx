// ─────────────────────────────────────────────────────────────────────────────
// Nucouths — Homepage Hero Banner
//
// Purely presentational — app/page.tsx fetches the live Hero banner
// (lib/banners.db.ts's getVisibleBannersFromDb, the exact same Banner row
// Admin → Banners manages) and passes it straight down. No client-side
// re-fetch: app/page.tsx already renders `dynamic = 'force-dynamic'`, so a
// fresh admin edit is already reflected in the server-rendered `banner` prop
// on the very next request — nothing to reconcile after mount. Stays a plain
// server component (no 'use client', no hooks) — the entrance motion below
// is pure CSS (Tailwind's `hero-in` keyframe, tailwind.config.ts), gated by
// `motion-safe:` so it's inert for prefers-reduced-motion with no JS needed
// either way.
//
// Height: `min-height` (not a fixed `height`) driven by two responsive
// clamp()s — one for the ≤lg tier (where Header's mobile search bar adds to
// the chrome above the hero: AnnouncementBar 36px + Header 56px + search bar
// 40px = 132px) and one for lg+ (AnnouncementBar 36px + Header 60px = 96px,
// no search bar). Each clamps `100svh - chrome` between a sensible floor and
// a ceiling a little under 100% of the viewport, so the hero reads as "about
// 80-90% of the visible viewport below the chrome" at any window height
// rather than a fixed pixel block, and never fights the sticky header (which
// sits in normal flow, so there's no overlap to guard against either way).
//
// Vertical content position: `justify-center` on the flex-col wrapper —
// centers the content block (headline+subtitle+CTAs) as one group, on any
// hero height, no fixed offset needed.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import type { Banner } from '@/lib/banners'

interface HeroBannerProps {
  banner: Banner | undefined
}

export function HeroBanner({ banner }: HeroBannerProps) {
  // No active/scheduled hero banner (all disabled, expired, or not yet
  // started) — nothing to show, rather than falling back to invented copy.
  if (!banner) return null

  const mobileImage = banner.mobileImage || banner.desktopImage

  return (
    <section
      aria-label={`${banner.title} — hero`}
      className="relative w-full overflow-hidden bg-black min-h-[clamp(560px,calc(100svh-132px),760px)] lg:min-h-[clamp(640px,calc(100svh-96px),88vh)]"
    >
      {/* Background image — separate desktop/mobile art direction; mobile
          falls back to the desktop image when none is set. Two
          object-position tiers, because the hero's own aspect ratio (not
          just the breakpoint) determines which way `cover` crops: at true
          desktop widths (lg+) the hero is wide relative to its height, so
          `cover` crops top/bottom only — centered horizontally, biased
          slightly above vertical-center so any crop trims floor/shadow
          before it touches the models' hair or the left negative space
          (verified at 1366–2560px). Below lg (tablets, and any window
          shorter than it is wide isn't the case here — this is the
          640–1023px width band) the hero is closer to square/portrait, so
          `cover` instead crops left/right with the full image height
          visible; centering horizontally there would crop equally off both
          the negative space AND the models, so this tier biases right
          toward the models instead (verified at 768×1024). */}
      <div className="hidden sm:block absolute inset-0">
        <Image
          src={banner.desktopImage}
          alt={banner.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_30%] lg:object-[center_38%]"
        />
      </div>
      <div className="sm:hidden absolute inset-0">
        <Image
          src={mobileImage}
          alt={banner.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[64%_22%]"
        />
      </div>

      {/* Cinematic overlay — reinforces the image's own dark negative space
          on the left (a real feature of the photography, not manufactured
          here) and fades to fully transparent well before the models, so
          their clothing and the studio's architectural light stay true to
          the original photograph rather than washed under a flat scrim. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 22%, rgba(0,0,0,0.15) 42%, rgba(0,0,0,0) 58%)',
        }}
        aria-hidden="true"
      />

      {/* Content — min-w-0 overrides the flex item's default min-content
          floor (flex-col's main axis is vertical, but a flex item's cross-
          axis width still won't shrink below its longest unwrapped line
          otherwise), which is what lets the headline actually wrap instead
          of overflowing the viewport at narrow widths. */}
      <div className="absolute inset-0 flex flex-col justify-start pt-8 sm:pt-10 lg:pt-0 lg:justify-center">
        <Container className="min-w-0">
          <div className="max-w-[500px] lg:max-w-[540px] motion-safe:animate-hero-in">
            <h1 className="font-display text-[2.6rem] sm:text-6xl lg:text-[clamp(4rem,6.25vw,5.5rem)] text-white leading-[1.04] tracking-tight mb-5">
              {banner.title}
            </h1>
            {banner.subtitle && (
              <p className="text-base lg:text-lg text-white/70 font-sans leading-relaxed mb-8 max-w-md">
                {banner.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              {banner.buttonText && banner.buttonLink && (
                <Link
                  href={banner.buttonLink}
                  className="inline-flex items-center justify-center h-13 px-8 bg-accent text-text-primary text-[11px] font-sans font-semibold tracking-[0.14em] uppercase hover:bg-accent-dark active:bg-accent-dark transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  {banner.buttonText}
                </Link>
              )}
              <Link
                href="/collections"
                className="inline-flex items-center justify-center h-13 px-8 border border-white/40 text-white text-[11px] font-sans font-medium tracking-[0.14em] uppercase hover:border-white hover:bg-white/10 transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                View Collections
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* Scroll indicator — simplified: no animated pulse, just a quiet
          label over a short static line. */}
      <div className="absolute bottom-8 right-6 lg:right-10 hidden lg:flex flex-col items-center gap-2.5" aria-hidden="true">
        <span className="text-[9px] font-sans text-white/40 tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-9 bg-white/25" />
      </div>
    </section>
  )
}
