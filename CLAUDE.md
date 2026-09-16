# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (flat config, extends `next/core-web-vitals` + `next/typescript`)

There is no test suite and no `typecheck` script. For ad hoc type checking use `npx tsc --noEmit`.

## Architecture

This is **Nucouths**, a single Next.js App Router storefront (no monorepo, no `src/` dir, path alias `@/*` → repo root). There is no backend, database, or auth — all content is served from typed mock data, structured so it can be swapped for a real API later without rewriting UI.

**Data layer** (`lib/`):
- `types.ts` — all shared types. Note `Product` (catalog/listing shape) vs `ProductDetail` (extends `Product` with `variants: ProductVariant[]`, care/materials/shipping copy, used only on the PDP). A `ProductVariant` is a unique (color × size) combination with its own `stock` count — this is the intended unit of purchase, not the bare `Product`. `CartItem`/cart types exist but there is no cart state/logic wired up yet.
- `mock-data.ts` — the actual data (products, nav, footer, announcement bar, social links). This is the one place to edit/extend catalog content.
- `product-filters.ts` — pure, data-source-agnostic filtering/sorting/faceting over `mock-data`'s `products`. `getFilteredProducts(params)` is the single entry point the listing page uses; it also derives facet counts (categories, sizes, colors, price range) from the *full* unfiltered set. When wiring a real backend, this is the function to replace — components should not need to change.
- `product-detail-data.ts` — per-slug `ProductDetail` lookups for the PDP.

**Routes** (`app/`): `/` (home), `/products` (PLP), `/products/[slug]` (PDP). `app/layout.tsx` renders global chrome (`AnnouncementBar`, `Header`, `Footer`) around every page and wires `next/font/google` fonts (Inter as `--font-inter`, Playfair Display as `--font-playfair`).

**Components** (`components/`), organized by scope rather than by page:
- `layout/` — site chrome: `Header`, `Footer`, `AnnouncementBar`, `MobileMenu`, `NewsletterForm`.
- `product/` — PDP-only: gallery, size/color selectors, accordion, add-to-bag, wishlist, delivery checker, related products, size guide.
- `products/` — PLP-only: grid, card, filters, sort bar, price slider.
- `ui/` — design-system primitives (`Badge`, `Button`, `Container`, `IconButton`, `ImageWithFallback`, `SectionHeading`) — reuse these instead of ad hoc markup/styling.

**Styling**: Tailwind v3 (`tailwind.config.ts`) with a custom token set (`background`, `text-primary`/`text-secondary`, `border`, `surface`, `accent` light/dark, `sale`, `header`, `announce`) — use these tokens rather than raw Tailwind palette colors or new ad hoc colors.



