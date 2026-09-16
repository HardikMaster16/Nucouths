'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { AnnouncementMessage } from '@/lib/types'

interface AnnouncementBarProps {
  messages: AnnouncementMessage[]
  /** Auto-rotate interval in ms. Default 4000 */
  interval?: number
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function AnnouncementBar({ messages, interval = 4000 }: AnnouncementBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating) return
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((index + messages.length) % messages.length)
        setIsAnimating(false)
      }, 250)
    },
    [isAnimating, messages.length]
  )

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])

  useEffect(() => {
    if (isPaused || messages.length <= 1) return
    const timer = setInterval(next, interval)
    return () => clearInterval(timer)
  }, [isPaused, next, interval, messages.length])

  if (!isVisible || messages.length === 0) return null

  const current = messages[currentIndex]

  return (
    <div
      className="relative bg-announce-bg text-announce-text"
      role="region"
      aria-label="Announcements"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-center h-9 px-8 sm:px-12">
        {/* Prev button */}
        {messages.length > 1 && (
          <button
            onClick={prev}
            aria-label="Previous announcement"
            className="absolute left-3 sm:left-4 p-1 text-white/60 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
          >
            <ChevronLeftIcon />
          </button>
        )}

        {/* Message */}
        <p
          className={[
            'text-2xs sm:text-xs font-sans tracking-wider text-center transition-opacity duration-250',
            isAnimating ? 'opacity-0' : 'opacity-100',
          ].join(' ')}
          aria-live="polite"
          aria-atomic="true"
        >
          {current.text}
          {current.linkHref && current.linkLabel && (
            <>
              {' '}
              <a
                href={current.linkHref}
                className="underline underline-offset-2 text-accent hover:text-accent-light transition-colors duration-150 ml-1"
              >
                {current.linkLabel} →
              </a>
            </>
          )}
        </p>

        {/* Dots indicator */}
        {messages.length > 1 && (
          <div className="absolute right-8 sm:right-10 hidden sm:flex items-center gap-1" aria-hidden="true">
            {messages.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to announcement ${i + 1}`}
                className={[
                  'w-1 h-1 rounded-full transition-all duration-250',
                  i === currentIndex ? 'bg-white w-3' : 'bg-white/40',
                ].join(' ')}
              />
            ))}
          </div>
        )}

        {/* Next button */}
        {messages.length > 1 && (
          <button
            onClick={next}
            aria-label="Next announcement"
            className="absolute right-3 sm:right-4 p-1 text-white/60 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
          >
            <ChevronRightIcon />
          </button>
        )}
      </div>
    </div>
  )
}
