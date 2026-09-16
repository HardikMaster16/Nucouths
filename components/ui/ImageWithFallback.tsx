'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import type { ProductImage } from '@/lib/types'

interface ImageWithFallbackProps {
  image: ProductImage
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  className?: string
  objectFit?: 'cover' | 'contain'
}

export function ImageWithFallback({
  image,
  fill = false,
  width,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  className = '',
  objectFit = 'cover',
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div
        className={[
          'flex items-center justify-center bg-surface',
          'text-text-secondary text-xs font-sans',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={image.alt}
        role="img"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={['object-cover', className].filter(Boolean).join(' ')}
        onError={() => setHasError(true)}
      />
    )
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={width ?? 400}
      height={height ?? 533}
      sizes={sizes}
      priority={priority}
      className={[objectFit === 'cover' ? 'object-cover' : 'object-contain', className]
        .filter(Boolean)
        .join(' ')}
      onError={() => setHasError(true)}
    />
  )
}
