import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { NewsletterForm } from '@/components/layout/NewsletterForm'
import type { FooterSection, SocialLink } from '@/lib/types'

interface FooterProps {
  sections: FooterSection[]
  socialLinks: SocialLink[]
  brandName: string
  tagline?: string
}

// ─── Social Icons ─────────────────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function PinterestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
    </svg>
  )
}

function TiktokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.72a4.85 4.85 0 0 1-1.01-.03z"/>
    </svg>
  )
}

const socialIconMap = {
  instagram: InstagramIcon,
  pinterest: PinterestIcon,
  tiktok: TiktokIcon,
  facebook: () => null,
  youtube: () => null,
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer({ sections, socialLinks, brandName, tagline }: FooterProps) {
  return (
    <footer className="bg-text-primary text-white mt-20" role="contentinfo">
      {/* ── Main Footer Grid ──────────────────────────────── */}
      <Container className="pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-block font-display text-xl tracking-[0.25em] uppercase text-white hover:text-accent transition-colors duration-250 mb-4"
              aria-label={`${brandName} — return to homepage`}
            >
              {brandName}
            </Link>
            {tagline && (
              <p className="text-sm font-sans text-white/50 leading-relaxed mb-6 max-w-[220px]">
                {tagline}
              </p>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = socialIconMap[social.icon]
                if (!Icon) return null
                return (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Follow us on ${social.platform}`}
                    className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-accent border border-white/10 hover:border-accent/40 rounded-sm transition-all duration-250"
                  >
                    <Icon />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Link Sections */}
          {sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-xs font-sans font-semibold tracking-widest uppercase text-white/30 mb-4">
                {section.heading}
              </h3>
              <ul className="space-y-2.5" role="list">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-sans text-white/60 hover:text-white transition-colors duration-200"
                      {...(link.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Column */}
          <div>
            <h3 className="text-xs font-sans font-semibold tracking-widest uppercase text-white/30 mb-4">
              Newsletter
            </h3>
            <p className="text-sm font-sans text-white/50 leading-relaxed mb-4">
              Early access to new arrivals and exclusive member offers.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </Container>

      {/* ── Bottom Bar ────────────────────────────────────── */}
      <div className="border-t border-white/10">
        <Container className="py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-sans text-white/30">
            <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
            <nav aria-label="Legal links" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/privacy" className="hover:text-white/60 transition-colors duration-150">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors duration-150">Terms &amp; Conditions</Link>
              <Link href="/shipping" className="hover:text-white/60 transition-colors duration-150">Shipping Policy</Link>
              <Link href="/returns" className="hover:text-white/60 transition-colors duration-150">Refund &amp; Returns</Link>
            </nav>
          </div>
        </Container>
      </div>
    </footer>
  )
}
