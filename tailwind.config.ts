/** @type {import('tailwindcss').Config} */
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Colors ─────────────────────────────────────────────────────────────
      colors: {
        background: '#FFFFFF',
        'text-primary': '#111111',
        'text-secondary': '#666666',
        border: '#E5E5E5',
        surface: '#F7F7F7',
        accent: {
          DEFAULT: '#C8A97E',
          light: '#E0CEAD',
          dark: '#A8844E',
        },
        sale: '#D94F3D',
        header: {
          bg: '#111111',
          text: '#FFFFFF',
        },
        announce: {
          bg: '#1A1A1A',
          text: '#FFFFFF',
        },
      },

      // ─── Typography ─────────────────────────────────────────────────────────
      // Sequel Sans (app/layout.tsx, self-hosted via next/font/local) is the
      // site's only typeface — "Disp" cut for headings/hero text, "Body" cut
      // for everything else. Both fall back to a plain sans stack (not a
      // serif) since Sequel Sans has no serif counterpart.
      fontFamily: {
        display: ['var(--font-sequel-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sequel-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.05' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
      },
      letterSpacing: {
        widest: '0.3em',
        wider: '0.15em',
        wide: '0.08em',
        normal: '0em',
      },

      // ─── Spacing ─────────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },

      // ─── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },

      // ─── Box Shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 40px -10px rgba(0,0,0,0.16)',
        header: '0 1px 0 0 #E5E5E5',
        dropdown: '0 4px 24px rgba(0,0,0,0.12)',
        btn: '0 1px 2px rgba(0,0,0,0.08)',
      },

      // ─── Container ────────────────────────────────────────────────────────────
      maxWidth: {
        container: '1440px',
        'container-sm': '1280px',
        'container-xs': '1024px',
      },

      // ─── Transitions ─────────────────────────────────────────────────────────
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ─── Animations ──────────────────────────────────────────────────────────
      keyframes: {
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-100%)', opacity: '0' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        /* Homepage hero content entrance (components/home/HeroBanner.tsx) —
           only ever applied via the `motion-safe:` variant. */
        'hero-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-left': 'slide-in-left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fade-in 0.25s ease-in-out',
        'marquee': 'marquee 20s linear infinite',
        'hero-in': 'hero-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) both',
      },

      // ─── Aspect Ratios ────────────────────────────────────────────────────────
      aspectRatio: {
        'product': '3 / 4',
        'hero': '16 / 7',
        'banner': '16 / 6',
        'square': '1 / 1',
      },
    },
  },
  plugins: [],
}

export default config
