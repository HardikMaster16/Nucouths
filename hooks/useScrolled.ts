'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when the window has been scrolled past `threshold` pixels.
 * Used for scroll-aware header styling.
 */
export function useScrolled(threshold = 10): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > threshold)
    }

    // Set initial state
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrolled
}
