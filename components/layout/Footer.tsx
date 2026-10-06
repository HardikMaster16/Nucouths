'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import type { FooterSection, SocialLink } from '@/lib/types'

interface FooterProps {
  sections: FooterSection[]
  socialLinks: SocialLink[]
  brandName: string
  tagline?: string
}

// Social Icons
function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

// Trust Badge Icons
function LeafIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}
function FabricIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
    </svg>
  )
}
function TruckIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

// Inline Newsletter Form
function InlineNewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    setStatus('success')
    setEmail('')
  }

  if (status === 'success') {
    return <p className="text-sm text-white/60 py-3">Thank you — you&apos;re on the list!</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center border border-white/20 overflow-hidden" aria-label="Newsletter signup" noValidate>
      <input
        type="email"
        placeholder="Your email address"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 h-12 px-4 bg-transparent text-sm font-sans text-white placeholder:text-white/35 focus:outline-none"
        aria-label="Email address for newsletter"
      />
      <button type="submit" className="w-12 h-12 flex items-center justify-center bg-white text-black flex-shrink-0 hover:bg-white/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Subscribe">
        <ArrowRightIcon />
      </button>
    </form>
  )
}

// Footer
export function Footer({ sections, socialLinks, brandName, tagline }: FooterProps) {
  return (
    <footer className="bg-black text-white" role="contentinfo" style={{ position: 'relative' }}>

      {/* Main Footer Grid */}
      <Container className="pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.6fr] gap-10 lg:gap-6">

          {/* Brand Column */}
          <div>
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity duration-250 mb-5" aria-label={`${brandName} — return to homepage`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/primary-logo.svg" alt={brandName} className="h-[90px] w-auto invert" />
            </Link>
            {tagline && (
              <p className="text-sm font-sans text-white/50 leading-relaxed max-w-[200px]">{tagline}</p>
            )}
          </div>

          {/* Link Sections */}
          {sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase text-white/40 mb-5">{section.heading}</h3>
              <ul className="space-y-3" role="list">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm font-sans text-white/70 hover:text-white transition-colors duration-200" {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Column */}
          <div>
            <p className="text-[10px] font-sans font-semibold tracking-[0.18em] uppercase text-white/40 mb-4">Join Our Journey</p>
            <h3 className="text-[1.65rem] font-display font-bold leading-tight text-white mb-3">Be the first to know.</h3>
            <p className="text-sm font-sans text-white/50 leading-relaxed mb-5">New arrivals, exclusive offers and style inspiration.</p>
            <InlineNewsletterForm />
            <div className="flex items-center gap-3 mt-5">
              <a href="https://instagram.com/nucouths" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram" className="w-10 h-10 flex items-center justify-center border border-white/30 rounded-full text-white/70 hover:text-white hover:border-white transition-all duration-250">
                <InstagramIcon />
              </a>
              <a href="https://facebook.com/nucouths" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Facebook" className="w-10 h-10 flex items-center justify-center border border-white/30 rounded-full text-white/70 hover:text-white hover:border-white transition-all duration-250">
                <FacebookIcon />
              </a>
              <a href="https://wa.me/nucouths" target="_blank" rel="noopener noreferrer" aria-label="Contact us on WhatsApp" className="w-10 h-10 flex items-center justify-center border border-white/30 rounded-full text-white/70 hover:text-white hover:border-white transition-all duration-250">
                <WhatsAppIcon />
              </a>
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom Bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.5)', position: 'relative', zIndex: 10, backgroundColor: '#000000' }}>
        <Container className="py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-[11px] font-sans text-white/35">
            <p className="shrink-0">&#169; {new Date().getFullYear()} {brandName}. All rights reserved.</p>
            <div className="flex items-center flex-wrap justify-center">
              <div className="flex items-center gap-2 px-4">
                <LeafIcon />
                <span className="tracking-[0.12em] uppercase text-[10px]">Crafted With Intention</span>
              </div>
              <span className="text-white/25">|</span>
              <div className="flex items-center gap-2 px-4">
                <FabricIcon />
                <span className="tracking-[0.12em] uppercase text-[10px]">Quality Fabrics</span>
              </div>
              <span className="text-white/25">|</span>
              <div className="flex items-center gap-2 px-4">
                <TruckIcon />
                <span className="tracking-[0.12em] uppercase text-[10px]">Fast &amp; Reliable Shipping</span>
              </div>
              <span className="text-white/25">|</span>
              <div className="flex items-center gap-2 px-4">
                <LockIcon />
                <span className="tracking-[0.12em] uppercase text-[10px]">Secure Check Out</span>
              </div>
            </div>
            <nav aria-label="Legal links" className="flex items-center gap-5 shrink-0">
              <Link href="/privacy" className="hover:text-white/70 transition-colors duration-150">Privacy</Link>
              <Link href="/terms" className="hover:text-white/70 transition-colors duration-150">Terms</Link>
              <Link href="/shipping" className="hover:text-white/70 transition-colors duration-150">Shipping</Link>
              <Link href="/returns" className="hover:text-white/70 transition-colors duration-150">Refunds</Link>
            </nav>
          </div>
        </Container>
      </div>

    </footer>
  )
}
