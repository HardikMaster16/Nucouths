import type { NextConfig } from 'next'

// ─────────────────────────────────────────────────────────────────────────────
// Security headers
//
// Set here (Next.js's built-in `headers()` config) rather than via a new
// proxy/middleware file on purpose: a proxy that generates a per-request
// CSP nonce requires every page to opt into dynamic rendering (Next.js's
// own CSP guide is explicit about this — "all pages must be dynamically
// rendered" — https://nextjs.org/docs/app/guides/content-security-policy).
// This app currently has several statically-rendered routes (/, /cart,
// /login, /register, /wishlist, /admin/login, etc.) — forcing them all
// dynamic just to add a nonce would be a real behavior/performance
// regression, not a security-only change. The `headers()` mechanism below
// applies to every route (static or dynamic) with no rendering-mode impact.
//
// Two DISTINCT Content-Security-Policy header entries exist below (one for
// the storefront, one for /admin/*), never both matching the same request:
// browsers intersect (not merge) multiple CSP headers on one response, so
// sending two overlapping ones would produce confusing, effectively-random
// breakage. The storefront pattern's negative lookahead is what keeps the
// two mutually exclusive.
//
// 'unsafe-inline' on script-src/style-src — genuinely required here, not a
// shortcut:
//   - script-src: the App Router streams RSC payloads via inline
//     `<script>self.__next_f.push(...)</script>` tags on every page (this
//     was directly visible in the raw HTML while testing the previous
//     admin-auth-hardening task). Without either a nonce (ruled out above)
//     or 'unsafe-inline', hydration itself breaks — nothing renders
//     interactively, not just a third-party script.
//   - style-src: several components set dynamic per-item colors via a
//     React `style={{ backgroundColor: ... }}` attribute (e.g.
//     components/product/ColorSelector.tsx, AdminProductDetailView.tsx's
//     variant swatches) — necessarily inline, since the hex value is
//     per-product data, not a fixed, enumerable set expressible as static
//     Tailwind classes.
// 'unsafe-eval' is added to script-src in development ONLY — React's dev
// build uses eval to reconstruct server-side error stacks in the browser;
// neither React nor Next.js use eval in production (same rationale as
// Next.js's own documented example).
// ─────────────────────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production'

/** Baseline every route shares. Storefront and admin CSPs each add their
 *  own script-src/style-src/img-src on top (see the two entries below) —
 *  this only carries the directives that are identical either way. */
const SHARED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
]

const SCRIPT_SRC = `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`
const STYLE_SRC = "style-src 'self' 'unsafe-inline'"

/** Storefront CSP — includes exactly the third-party origins the app
 *  actually loads in a browser:
 *
 *   - checkout.razorpay.com (script-src, frame-src): lib/razorpay-client.ts
 *     loads https://checkout.razorpay.com/v1/checkout.js via a real
 *     dynamically-created <script> tag, and Razorpay Checkout opens its
 *     payment UI in an iframe from the same host.
 *   - api.razorpay.com, lumberjack.razorpay.com (connect-src): the
 *     Checkout script's own API calls and logging beacon while running in
 *     our page (verified against a real-world CSP fix for the same
 *     checkout.js widget, since Razorpay doesn't publish this list
 *     itself).
 *
 *   Everything else (product images, fonts) is same-origin only:
 *   next/image proxies every remote image (next.config's own
 *   images.remotePatterns for images.unsplash.com/plus.unsplash.com)
 *   through Next's own /_next/image route server-side — the BROWSER never
 *   requests Unsplash directly, so img-src doesn't need it. next/font
 *   self-hosts Sequel Sans as same-origin static files, so
 *   font-src needs nothing external either. No analytics/tracking script
 *   exists anywhere in this codebase (verified: no next/script usage, no
 *   <script src> beyond the Razorpay loader above, no client-side fetch()
 *   to any third-party host). */
const STOREFRONT_CSP = [
  ...SHARED_CSP_DIRECTIVES,
  `${SCRIPT_SRC} https://checkout.razorpay.com`,
  STYLE_SRC,
  "img-src 'self'",
  "frame-src https://checkout.razorpay.com",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
].join('; ')

/** Admin CSP — no Razorpay (nothing under /admin ever touches payment),
 *  but img-src is deliberately wider: the banner and product-image admin
 *  forms (components/admin/banners/BannerFormModal.tsx, components/admin/
 *  products/form/ImagesSection.tsx) render a live preview via a raw <img>
 *  (not next/image, so remotePatterns doesn't apply) of whatever the admin
 *  either pastes as a URL or picks as a local file — the latter shows up
 *  as a data: URI (both files check `.startsWith('data:')`). `https:` (not
 *  a specific host list) is intentional here: this is a same-privilege,
 *  admin-only content-authoring surface, not a general widening of the
 *  storefront's attack surface, and the whole point of the field is that
 *  the admin can point it at any real image host. */
const ADMIN_CSP = [
  ...SHARED_CSP_DIRECTIVES,
  SCRIPT_SRC,
  STYLE_SRC,
  "img-src 'self' https: data:",
  "frame-src 'none'",
  "connect-src 'self'",
].join('; ')

const nextConfig: NextConfig = {
  // Disable the floating dev-mode indicator ("N" button)
  devIndicators: false,
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB request body cap — too small for
      // the product-image upload action (lib/admin/upload-image.actions.ts),
      // which enforces its own 4MB file-size limit. Headroom above 4MB
      // covers multipart/form-data overhead.
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Every route — headers with no CSP-style "multiple headers
        // intersect" hazard, so one shared entry is safe.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            // Disabled for features this app never uses; `payment` is
            // deliberately left unrestricted (browser default) since
            // Razorpay Checkout may rely on the Payment Request API for
            // some payment methods.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=()',
          },
          // HSTS only in production, and only ever sent over HTTPS to
          // begin with (browsers ignore it entirely on a plain-HTTP
          // response) — local `npm run dev` on http://localhost is
          // unaffected either way. includeSubDomains/preload are left out
          // deliberately: both apply beyond this app's own routes (every
          // subdomain, and — for preload — every future deploy,
          // effectively permanently), which isn't this task's call to
          // make without confirming every subdomain already serves HTTPS.
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }] : []),
        ],
      },
      {
        // Storefront — everything except /admin/*. The negative lookahead
        // is what keeps this from ALSO matching admin routes (see the
        // module docstring on why that matters for CSP specifically).
        source: '/((?!admin).*)',
        headers: [{ key: 'Content-Security-Policy', value: STOREFRONT_CSP }],
      },
      {
        source: '/admin/:path*',
        headers: [{ key: 'Content-Security-Policy', value: ADMIN_CSP }],
      },
    ]
  },
}

export default nextConfig
