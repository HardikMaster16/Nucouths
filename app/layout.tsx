import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { StorefrontChrome } from '@/components/layout/StorefrontChrome'
import { CartProvider } from '@/lib/cart-context'
import { WishlistProvider } from '@/lib/wishlist-context'
import { AuthProvider } from '@/lib/auth-context'
import { AddressProvider } from '@/lib/address-context'
import { announcementMessages, navItems, footerSections, socialLinks } from '@/lib/mock-data'

// ─── Fonts ───────────────────────────────────────────────────────────────────
//
// Sequel Sans is the site's only typeface (see tailwind.config.ts's
// fontFamily) — its "Body" optical cut for everything Tailwind's font-sans
// token touches (nav, paragraphs, buttons, form fields), and its "Disp"
// (Display) cut for font-display headings/hero text. Only the weights
// Tailwind utilities actually request anywhere in the app are loaded
// (font-normal/medium/semibold/bold — grepped, nothing above Bold or below
// Regular is used), so this stays as lean as next/font/google's previous
// Inter/Playfair Display setup while being fully self-hosted from
// fonts/sequel-sans/ instead of Google's CDN.
const sequelSansBody = localFont({
  src: [
    { path: '../fonts/sequel-sans/sequel-sans-body-regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-body-medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-body-semibold.ttf', weight: '600', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-body-bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sequel-body',
  display: 'swap',
})

const sequelSansDisplay = localFont({
  src: [
    { path: '../fonts/sequel-sans/sequel-sans-display-regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-display-medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/sequel-sans/sequel-sans-display-semibold.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-sequel-display',
  display: 'swap',
})

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: 'Nucouths — Premium Fashion',
    template: '%s | Nucouths',
  },
  description:
    'Discover premium fashion at Nucouths. Shop curated collections for men and women — contemporary style meets thoughtful craftsmanship.',
  keywords: ['fashion', 'clothing', 'premium', 'men', 'women', 'collections', 'Nucouths'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Nucouths',
    title: 'Nucouths — Premium Fashion',
    description:
      'Discover premium fashion at Nucouths. Shop curated collections for men and women.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nucouths — Premium Fashion',
    description:
      'Discover premium fashion at Nucouths. Shop curated collections for men and women.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${sequelSansBody.variable} ${sequelSansDisplay.variable}`}>
      <body className="min-h-screen flex flex-col bg-background font-sans antialiased">
        <AuthProvider>
          <AddressProvider>
            <CartProvider>
              <WishlistProvider>
                {/* Announcement Bar + Header — storefront only, never on /admin */}
                <StorefrontChrome>
                  <AnnouncementBar messages={announcementMessages} interval={4500} />
                  <Header navItems={navItems} />
                </StorefrontChrome>

                {/* Main Content — pages render their own <main> where needed */}
                <div id="page-content" className="flex-1">
                  {children}
                </div>

                {/* Footer — storefront only, never on /admin */}
                <StorefrontChrome>
                  <Footer
                    sections={footerSections}
                    socialLinks={socialLinks}
                    brandName="Nucouths"
                    tagline="Contemporary fashion crafted with intention. Quality that endures."
                  />
                </StorefrontChrome>
              </WishlistProvider>
            </CartProvider>
          </AddressProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
