import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/lib/cart-context'
import { WishlistProvider } from '@/lib/wishlist-context'
import { AuthProvider } from '@/lib/auth-context'
import { announcementMessages, navItems, footerSections, socialLinks } from '@/lib/mock-data'

// ─── Fonts ───────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
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
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col bg-background font-sans antialiased">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {/* Announcement Bar */}
              <AnnouncementBar messages={announcementMessages} interval={4500} />

              {/* Header */}
              <Header navItems={navItems} />

              {/* Main Content — pages render their own <main> where needed */}
              <div id="page-content" className="flex-1">
                {children}
              </div>

              {/* Footer */}
              <Footer
                sections={footerSections}
                socialLinks={socialLinks}
                brandName="Nucouths"
                tagline="Contemporary fashion crafted with intention. Quality that endures."
              />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
